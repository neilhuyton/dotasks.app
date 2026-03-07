import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

// Define all mocked functions and objects FIRST so they exist when the store is created
const safeGetSession =
  vi.fn<
    () => Promise<{ data: { session: Session | null }; error: Error | null }>
  >();

const safeSignInWithPassword = vi.fn<
  (credentials: { email: string; password: string }) => Promise<{
    data: { user: User | null; session: Session | null };
    error: Error | null;
  }>
>();

const trpcClient = {
  user: {
    createOrSync: {
      mutate: vi
        .fn<(input: { id: string; email: string }) => Promise<void>>()
        .mockResolvedValue(undefined),
    },
  },
};

const queryClientMock = {
  invalidateQueries: vi.fn(),
  clear: vi.fn(),
};

const getQueryClient = vi.fn().mockReturnValue(queryClientMock);

// Now mock the modules using the variables defined above
vi.mock("@/lib/supabase-utils", () => ({
  safeGetSession,
  safeSignInWithPassword,
}));

vi.mock("@/trpc", () => ({
  trpcClient,
}));

vi.mock("@/queryClient", () => ({
  getQueryClient,
}));

// Spy on Supabase realtime setAuth
vi.spyOn(supabase.realtime, "setAuth");

describe("useAuthStore", () => {
  let useAuthStore: {
    getState: () => AuthState;
    setState: (
      partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>),
    ) => void;
  };

  interface AuthState {
    session: Session | null;
    user: User | null;
    loading: boolean;
    error: Error | null;
    isInitialized: boolean;

    initialize: () => Promise<void>;
    signIn: (
      email: string,
      password: string,
    ) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    updateUserEmail: (newEmail: string) => void;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore = create<AuthState>((set, get) => {
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
          // ignored
        }
      };

      const updateRealtimeAuth = (access_token: string | null) => {
        supabase.realtime.setAuth(access_token);
      };

      supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user ?? null;
        updateRealtimeAuth(session?.access_token ?? null);
        set({
          session,
          user,
          loading: false,
          error: null,
          isInitialized: true,
        });

        if (
          ["TOKEN_REFRESHED", "SIGNED_IN", "INITIAL_SESSION"].includes(event)
        ) {
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
            setError(err);
            set({
              loading: false,
              isInitialized: true,
              session: null,
              user: null,
            });
          }
        },

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

        signOut: async () => {
          set({ loading: true, error: null });

          const ref = new URL(
            import.meta.env.VITE_SUPABASE_URL as string,
          ).hostname.split(".")[0];
          localStorage.removeItem(`sb-${ref}-auth-token`);
          Object.keys(localStorage)
            .filter((key) => key.startsWith("sb-") && key.includes("-auth"))
            .forEach((key) => localStorage.removeItem(key));

          updateRealtimeAuth(null);
          supabase.auth.signOut({ scope: "local" }).catch(() => {
            // ignored
          });

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

    // Trigger store creation and onAuthStateChange listener setup
    useAuthStore.getState();
  });

  it("reaches initialized state quickly after creation", () => {
    const state = useAuthStore.getState();
    expect(state.loading).toBe(false);
    expect(state.isInitialized).toBe(true);
    expect(state.error).toBeNull();
  });

  describe("initialize()", () => {
    it("loads existing session and syncs user", async () => {
      const mockSession: Session = {
        access_token: "at-123",
        refresh_token: "rt-456",
        user: { id: "u-789", email: "test@example.com" } as User,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        provider_token: null,
        provider_refresh_token: null,
      };

      vi.mocked(safeGetSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(supabase.realtime.setAuth).toHaveBeenCalledWith("at-123");
      expect(trpcClient.user.createOrSync.mutate).toHaveBeenCalledWith({
        id: "u-789",
        email: "test@example.com",
      });

      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(state.session).toEqual(mockSession);
      expect(state.user?.id).toBe("u-789");
    });

    it("handles error during initialization", async () => {
      const fakeError = new Error("boom");
      vi.mocked(safeGetSession).mockRejectedValue(fakeError);

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(state.error).toBe(fakeError);
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe("signIn()", () => {
    it("successful sign in updates state and syncs user", async () => {
      const mockUser: User = { id: "abc123", email: "hi@me.com" } as User;

      const mockSession: Session = {
        access_token: "new-at",
        refresh_token: "new-rt",
        user: mockUser,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        provider_token: null,
        provider_refresh_token: null,
      };

      vi.mocked(safeSignInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await act(async () =>
        useAuthStore.getState().signIn("hi@me.com", "pass123"),
      );

      expect(result?.error).toBeNull();
      expect(supabase.realtime.setAuth).toHaveBeenCalledWith("new-at");
      expect(trpcClient.user.createOrSync.mutate).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
      expect(state.user?.email).toBe("hi@me.com");
      expect(state.session?.access_token).toBe("new-at");
    });

    it("failed sign in sets error", async () => {
      const authError = new Error("Invalid login credentials");

      vi.mocked(safeSignInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const result = await act(async () =>
        useAuthStore.getState().signIn("bad@email.com", "wrong"),
      );

      expect(result.error).toBe(authError);
      expect(useAuthStore.getState().error).toBe(authError);
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe("signOut()", () => {
    it("clears auth state and removes localStorage tokens", async () => {
      const mockSession: Session = {
        access_token: "old-at",
        refresh_token: "old-rt",
        user: { id: "x" } as User,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        provider_token: null,
        provider_refresh_token: null,
      };

      useAuthStore.setState({
        session: mockSession,
        user: { id: "x" } as User,
        loading: false,
        isInitialized: true,
      });

      vi.spyOn(localStorage, "removeItem").mockImplementation(() => {});

      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(supabase.realtime.setAuth).toHaveBeenCalledWith(null);
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.isInitialized).toBe(true);
    });
  });
});
