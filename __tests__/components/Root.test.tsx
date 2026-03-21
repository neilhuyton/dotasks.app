import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import { Root } from "@/components/Root";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import type { AuthState } from "@steel-cut/steel-lib";

vi.mock("@/store/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/queryClient", () => ({
  getQueryClient: vi.fn(() => ({})),
}));

vi.mock("@/trpc", () => ({
  trpcClient: {},
  TRPCProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="trpc-provider">{children}</div>
  ),
}));

vi.mock("@/router", () => ({
  router: {},
}));

vi.mock("@steel-cut/steel-lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@steel-cut/steel-lib")>();
  return {
    ...actual,
    useRealtimeSubscription: vi.fn(),
    BannerProvider: ({ children }: { children: ReactNode }) => (
      <div data-testid="banner-provider">{children}</div>
    ),
    ThemeProvider: ({ children }: { children: ReactNode }) => (
      <div data-testid="theme-provider">{children}</div>
    ),
  };
});

vi.mock("./RealtimeListeners", () => ({
  RealtimeListeners: () => <div data-testid="realtime-listeners">Realtime</div>,
}));

vi.mock("./AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

vi.mock("@tanstack/react-router", () => ({
  RouterProvider: () => <div data-testid="router-provider">Router content</div>,
}));

describe("Root", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state: AuthState = {
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
      };

      return typeof selector === "function" ? selector(state) : state;
    });
  });

  it.skip("renders without crashing and calls auth initialize on mount", async () => {
    const mockInitialize = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state: AuthState = {
        user: null,
        session: null,
        loading: false,
        error: null,
        isInitialized: true,
        lastRefreshFailed: false,
        initialize: mockInitialize,
        signIn: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue(undefined),
        waitUntilReady: vi.fn().mockResolvedValue(null),
        updateUserEmail: vi.fn(),
        changeUserEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUserPassword: vi.fn().mockResolvedValue({ error: null }),
        setSession: vi.fn(),
        setLastRefreshFailed: vi.fn(),
      };

      return typeof selector === "function" ? selector(state) : state;
    });

    const { getByTestId } = render(<Root />);

    await waitFor(() => {
      expect(getByTestId("router-provider")).toBeInTheDocument();
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it("shows error boundary fallback when a child throws", () => {
    vi.doMock("@tanstack/react-router", () => ({
      RouterProvider: () => {
        throw new Error("Boom!");
      },
    }));

    render(<Root />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(
        "An unexpected error occurred. Please refresh the page.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
  });

  it.skip("wraps content in the expected providers", async () => {
    const { getByTestId } = render(<Root />);

    await waitFor(() => {
      expect(getByTestId("router-provider")).toBeInTheDocument();
      expect(getByTestId("realtime-listeners")).toBeInTheDocument();
      expect(getByTestId("auth-provider")).toBeInTheDocument();
      expect(getByTestId("banner-provider")).toBeInTheDocument();
      expect(getByTestId("theme-provider")).toBeInTheDocument();
      expect(getByTestId("trpc-provider")).toBeInTheDocument();
    });
  });
});
