import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useAuthStore } from "@/store/authStore";
import { renderWithProviders } from "../../utils/test-helpers";
import { suppressActWarnings } from "../../utils/act-suppress";
import { APP_CONFIG } from "@/appConfig";

suppressActWarnings();

vi.mock("@/store/authStore", () => {
  const mockHook = vi.fn();

  return {
    useAuthStore: mockHook,
  };
});

const createMockAuthState = (overrides = {}) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  isInitialized: true,
  initialize: vi.fn().mockResolvedValue(undefined),
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  waitUntilReady: vi.fn().mockResolvedValue(null),
  updateUserEmail: vi.fn().mockResolvedValue({ error: null }),
  updateUserPassword: vi.fn().mockResolvedValue({ error: null }),
  setSession: vi.fn(),
  ...overrides,
});

describe("Authenticated Layout Route (/_authenticated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockGetState = vi.fn();

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = createMockAuthState();
      return selector ? selector(state) : state;
    });

    Object.defineProperty(useAuthStore, "getState", {
      value: mockGetState,
      writable: true,
    });
  });

  it("shows loading screen when loading is true", async () => {
    const loadingState = createMockAuthState({ loading: true });

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return selector ? selector(loadingState) : loadingState;
    });

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

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return selector ? selector(loadingState) : loadingState;
    });

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
    const mockUser = { id: "user-123", email: "test@example.com" };

    const authState = createMockAuthState({ user: mockUser, loading: false });

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return selector ? selector(authState) : authState;
    });

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

    const mockUser = { id: "user-123", email: "test@example.com" };

    const authState = createMockAuthState({ user: mockUser, loading: false });

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return selector ? selector(authState) : authState;
    });

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
