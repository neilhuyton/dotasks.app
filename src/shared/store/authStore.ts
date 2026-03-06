// src/shared/store/authStore.ts

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import {
  safeGetSession,
  safeSignInWithPassword,
  safeSignUp,
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
  updateUserEmail: (newEmail: string) => void;
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
    } catch {}
  };

  const updateRealtimeAuth = (access_token: string | null) => {
    supabase.realtime.setAuth(access_token);
  };

  supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user ?? null;
    updateRealtimeAuth(session?.access_token ?? null);
    set({ session, user, loading: false, error: null, isInitialized: true });

    if (["TOKEN_REFRESHED", "SIGNED_IN", "INITIAL_SESSION"].includes(event)) {
      getQueryClient().invalidateQueries();
      await syncUser(user);
    }

    if (!session) {
      getQueryClient().clear();
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
        if (session?.access_token) {
          updateRealtimeAuth(session.access_token);
        }
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
        console.error("Auth init failed:", err);
        setError(err);
        set({
          loading: false,
          isInitialized: true,
          session: null,
          user: null,
        });
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
        }, 6000);
      }),

    signIn: async (email: string, password: string) => {
      set({ loading: true, error: null });
      try {
        const { data, error } = await safeSignInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const session = data.session;
        const user = data.user ?? null;
        if (session?.access_token) {
          updateRealtimeAuth(session.access_token);
        }
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

    signUp: async (email: string, password: string) => {
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
        if (session?.access_token) {
          updateRealtimeAuth(session.access_token);
        }
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

      const ref = new URL(import.meta.env.VITE_SUPABASE_URL!).hostname.split(
        ".",
      )[0];
      localStorage.removeItem(`sb-${ref}-auth-token`);

      Object.keys(localStorage)
        .filter((key) => key.startsWith("sb-") && key.includes("-auth"))
        .forEach((key) => localStorage.removeItem(key));

      updateRealtimeAuth(null);

      supabase.auth.signOut({ scope: "local" }).catch(() => {});

      set({
        session: null,
        user: null,
        loading: false,
        error: null,
        isInitialized: true,
      });

      getQueryClient().clear();
    },

    updateUserEmail: (newEmail: string) => {
      set((state) => ({
        user: state.user ? { ...state.user, email: newEmail } : null,
      }));
    },
  };
});
