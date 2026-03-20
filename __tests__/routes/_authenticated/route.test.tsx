import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useAuthStore } from "@/store/authStore";
import { renderWithProviders } from "../../utils/test-helpers";
import { suppressActWarnings } from "../../utils/act-suppress";
import { APP_CONFIG } from "@/appConfig";
import type { AuthState } from "@steel-cut/steel-lib";
import type { User } from "@supabase/supabase-js";

suppressActWarnings();

vi.mock("@/store/authStore", () => {
  const mockHook = vi.fn();
  return {
    useAuthStore: mockHook,
  };
});

const createMockAuthState = (
  overrides: Partial<AuthState> = {},
): AuthState => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  isInitialized: true,
  lastRefreshFailed: false,
  initialize: vi.fn().mockResolvedValue(undefined),
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
  waitUntilReady: vi.fn().mockResolvedValue(null),
  updateUserEmail: vi.fn(),
  changeUserEmail: vi.fn().mockResolvedValue({ error: null }),
  updateUserPassword: vi.fn().mockResolvedValue({ error: null }),
  setSession: vi.fn(),
  setLastRefreshFailed: vi.fn(),
  ...overrides,
});

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2025-01-01T00:00:00Z",
  role: "authenticated",
  email_confirmed_at: "2025-01-01T00:00:00Z",
  phone: undefined,
  confirmation_sent_at: undefined,
  confirmed_at: "2025-01-01T00:00:00Z",
  recovery_sent_at: undefined,
  last_sign_in_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  identities: undefined,
  factors: undefined,
  ...overrides,
});

describe("Authenticated Layout Route (/_authenticated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = createMockAuthState();
      return selector ? selector(state) : state;
    });

    Object.defineProperty(useAuthStore, "getState", {
      value: vi.fn().mockReturnValue(createMockAuthState()),
      writable: true,
    });
  });

  it("shows loading screen when loading is true", async () => {
    const loadingState = createMockAuthState({ loading: true });

    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector ? selector(loadingState) : loadingState,
    );

    Object.defineProperty(useAuthStore, "getState", {
      value: vi.fn().mockReturnValue(loadingState),
      writable: true,
    });

    renderWithProviders({
      initialEntries: [APP_CONFIG.defaultAuthenticatedPath],
    });

    await waitFor(() => {
      expect(screen.getByText("Loading session...")).toBeInTheDocument();
    });
  });

  it("does not redirect immediately when loading is true", async () => {
    const loadingState = createMockAuthState({ loading: true });

    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector ? selector(loadingState) : loadingState,
    );

    Object.defineProperty(useAuthStore, "getState", {
      value: vi.fn().mockReturnValue(loadingState),
      writable: true,
    });

    const { router } = renderWithProviders({
      initialEntries: [APP_CONFIG.defaultAuthenticatedPath],
    });

    await waitFor(() => {
      expect(screen.getByText("Loading session...")).toBeInTheDocument();
    });

    expect(router.state.location.pathname).not.toBe("/login");
  });

  it("renders ProfileIcon in the header when authenticated", async () => {
    const mockUser = createMockUser();

    const authState = createMockAuthState({
      user: mockUser,
      loading: false,
    });

    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector ? selector(authState) : authState,
    );

    Object.defineProperty(useAuthStore, "getState", {
      value: vi.fn().mockReturnValue(authState),
      writable: true,
    });

    renderWithProviders({
      initialEntries: [APP_CONFIG.defaultAuthenticatedPath],
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /profile/i }),
      ).toBeInTheDocument();
    });
  });

  it("navigates to /profile when ProfileIcon is clicked", async () => {
    const user = userEvent.setup();

    const mockUser = createMockUser();

    const authState = createMockAuthState({
      user: mockUser,
      loading: false,
    });

    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector ? selector(authState) : authState,
    );

    Object.defineProperty(useAuthStore, "getState", {
      value: vi.fn().mockReturnValue(authState),
      writable: true,
    });

    const { router } = renderWithProviders({
      initialEntries: [APP_CONFIG.defaultAuthenticatedPath],
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /profile/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /profile/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/profile");
    });
  });
});
