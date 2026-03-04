// src/shared/store/authStore.ts

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { getQueryClient } from "@/queryClient";
import { trpcClient } from "@/trpc";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateUserEmail: (newEmail: string) => void;

  supabase: typeof supabase;
}

export const getAuthState = () => useAuthStore.getState();

export const useAuthStore = create<AuthState>()((set) => {
  const syncUser = async (user: User | null) => {
    if (!user?.id || !user.email) return;
    try {
      await trpcClient.user.createOrSync.mutate({
        id: user.id,
        email: user.email,
      });
    } catch {
      // empty catch
    }
  };

  const clearCacheOnSignOut = () => {
    getQueryClient().clear();
  };

  supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session?.user ?? null;
    set({ session, user, loading: false, error: null });
    await syncUser(user);
    if (!session) {
      clearCacheOnSignOut();
    }
  });

  return {
    session: null,
    user: null,
    loading: true,
    error: null,

    supabase,

    initialize: async () => {
      set({ loading: true, error: null });

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;
        const user = session?.user ?? null;

        set({ session, user, loading: false, error: null });
        await syncUser(user);
      } catch (err) {
        set({
          loading: false,
          error:
            err instanceof Error
              ? err
              : new Error("Auth initialization failed"),
        });
      }
    },

    signUp: async (email: string, password: string) => {
      set({ loading: true, error: null });

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/welcome`,
          },
        });

        if (error) throw error;

        const user = data.user ?? null;

        set({
          session: data.session,
          user,
          loading: false,
          error: null,
        });

        await syncUser(user);

        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Signup failed");
        set({ loading: false, error });
        return { error };
      }
    },

    signIn: async (email: string, password: string) => {
      set({ loading: true, error: null });

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const user = data.user ?? null;

        set({
          session: data.session,
          user,
          loading: false,
          error: null,
        });

        await syncUser(user);

        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Login failed");
        set({ loading: false, error });
        return { error };
      }
    },

    signOut: async () => {
      set({ loading: true, error: null });

      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        const projectRef = new URL(
          import.meta.env.VITE_SUPABASE_URL!,
        ).hostname.split(".")[0];
        localStorage.removeItem(`sb-${projectRef}-auth-token`);

        set({
          session: null,
          user: null,
          loading: false,
          error: null,
        });

        clearCacheOnSignOut();
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Sign out failed");
        set({ loading: false, error });
      }
    },

    updateUserEmail: (newEmail: string) => {
      set((state) => ({
        user: state.user ? { ...state.user, email: newEmail } : null,
      }));
    },
  };
});
