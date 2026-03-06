// src/shared/store/authStore.ts

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import {
  safeGetSession,
  safeSignInWithPassword,
  safeSignUp,
  safeSignOut,
} from "@/lib/supabase-utils";
import { trpcClient } from "@/trpc";
import type { Session, User } from "@supabase/supabase-js";
import { getQueryClient } from "@/queryClient";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  waitUntilReady: () => Promise<Session | null>;
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const setError = (err: unknown) =>
    set({
      error: err instanceof Error ? err : new Error(String(err)),
      loading: false,
    });

  const syncUser = async (user: User | null) => {
    if (!user?.id || !user.email) return;
    try {
      await trpcClient.user.createOrSync.mutate({
        id: user.id,
        email: user.email,
      });
    } catch {
      // empty
    }
  };

  supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user ?? null;
    set({ session, user, loading: false, error: null, isInitialized: true });

    if (["TOKEN_REFRESHED", "SIGNED_IN", "INITIAL_SESSION"].includes(event)) {
      getQueryClient().invalidateQueries();
      supabase.realtime.setAuth(session?.access_token ?? null);
      await syncUser(user);
    }

    if (!session) {
      getQueryClient().clear();
      supabase.realtime.setAuth(null);
    }
  });

  return {
    session: null,
    user: null,
    loading: true,
    error: null,
    isInitialized: false,

    initialize: async () => {
      set({ loading: true, error: null, isInitialized: false });
      try {
        const {
          data: { session },
        } = await safeGetSession();
        if (session) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        }
        const user = session?.user ?? null;
        set({
          session,
          user,
          loading: false,
          error: null,
          isInitialized: true,
        });
        await syncUser(user);
      } catch (err) {
        setError(err);
        set({ isInitialized: true });
      }
    },

    waitUntilReady: () =>
      new Promise<Session | null>((resolve) => {
        const { isInitialized, session } = get();
        if (isInitialized) return resolve(session);

        const unsubscribe = useAuthStore.subscribe(
          ({ isInitialized, session }) => {
            if (isInitialized) {
              unsubscribe();
              resolve(session);
            }
          },
        );

        setTimeout(() => {
          unsubscribe();
          resolve(null);
        }, 10000);
      }),

    signIn: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const { data, error } = await safeSignInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const session = data.session;
        const user = data.user ?? null;
        set({
          session,
          user,
          loading: false,
          error: null,
          isInitialized: true,
        });
        await syncUser(user);
        return { error: null };
      } catch (err) {
        setError(err);
        return { error: get().error };
      }
    },

    signUp: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const { data, error } = await safeSignUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/welcome` },
        });
        if (error) throw error;
        const session = data.session;
        const user = data.user ?? null;
        set({
          session,
          user,
          loading: false,
          error: null,
          isInitialized: true,
        });
        await syncUser(user);
        return { error: null };
      } catch (err) {
        setError(err);
        return { error: get().error };
      }
    },

    signOut: async () => {
      set({ loading: true, error: null });
      try {
        const { error } = await safeSignOut();
        if (error) throw error;

        const ref = new URL(import.meta.env.VITE_SUPABASE_URL!).hostname.split(
          ".",
        )[0];
        localStorage.removeItem(`sb-${ref}-auth-token`);

        set({
          session: null,
          user: null,
          loading: false,
          error: null,
          isInitialized: true,
        });
        getQueryClient().clear();
        supabase.realtime.setAuth(null);
      } catch (err) {
        setError(err);
      }
    },
  };
});
