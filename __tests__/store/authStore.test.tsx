import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/authStore";

vi.mock("@/lib/supabase", () => {
  const mockAuth = {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    setSession: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  };

  const mockSupabase = {
    auth: mockAuth,
  } as unknown as SupabaseClient;

  return { supabase: mockSupabase };
});

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is created using the mocked supabase client", () => {
    const store = useAuthStore.getState();

    expect(store).toBeDefined();
    expect(store.initialize).toBeDefined();
    expect(typeof store.initialize).toBe("function");

    expect(store.loading).toBe(true);
    expect(store.isInitialized).toBe(false);
    expect(store.user).toBeNull();
    expect(store.session).toBeNull();
    expect(store.error).toBeNull();
  });

  it("exports a zustand hook that can be called", () => {
    const store = useAuthStore.getState();

    expect(store).toBeDefined();
    expect(typeof store.initialize).toBe("function");
    expect(typeof store.signIn).toBe("function");
    expect(typeof store.signUp).toBe("function");
    expect(typeof store.signOut).toBe("function");
    expect(typeof store.waitUntilReady).toBe("function");
  });

  it("exposes expected AuthState shape when called without selector", () => {
    const store = useAuthStore.getState();

    expect(store).toMatchObject({
      user: null,
      session: null,
      loading: true,
      error: null,
      isInitialized: false,
      initialize: expect.any(Function),
      signIn: expect.any(Function),
      signUp: expect.any(Function),
      signOut: expect.any(Function),
      waitUntilReady: expect.any(Function),
      updateUserEmail: expect.any(Function),
      setSession: expect.any(Function),
    });
  });

  it("can access initialize function via getState", () => {
    const initialize = useAuthStore.getState().initialize;

    expect(typeof initialize).toBe("function");
  });

  it("exposes initial loading state via getState", () => {
    const loading = useAuthStore.getState().loading;
    expect(loading).toBe(true);
  });
});
