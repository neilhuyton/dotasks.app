// __tests__/routes/_authenticated/route.test.tsx

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";

import { useAuthStore } from "@/shared/store/authStore";
import { Route as AuthenticatedRoute } from "@/app/routes/_authenticated/route";
import { suppressActWarnings } from "../../../__tests__/act-suppress";

suppressActWarnings();

vi.mock("@/shared/store/authStore", () => {
  return {
    useAuthStore: vi.fn(),
  };
});

const createMockAuthState = (overrides = {}) => ({
  user: null,
  loading: false,
  initialize: vi.fn().mockResolvedValue(undefined),
  session: null,
  error: null,
  isInitialized: true,
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  waitUntilReady: vi.fn().mockResolvedValue(null),
  updateUserEmail: vi.fn().mockResolvedValue({ error: null }),
  ...overrides,
});

describe("Authenticated Layout Route (/_authenticated)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = createMockAuthState();
      return selector ? selector(state) : state;
    });

    vi.mocked(useAuthStore).getState = vi.fn(() => createMockAuthState());
  });

  const setupRouter = (initialEntries = ["/dashboard"]) => {
    const history = createMemoryHistory({ initialEntries });

    const routeTree = AuthenticatedRoute.addChildren([
      createRoute({
        getParentRoute: () => AuthenticatedRoute,
        path: "dashboard",
        component: () => (
          <div data-testid="child-content">Protected Content</div>
        ),
      }),
    ]);

    const router = createRouter({
      routeTree,
      history,
      context: { queryClient },
      defaultPendingMinMs: 0,
      defaultPreloadStaleTime: 0,
    });

    return { router };
  };

  it.skip("redirects to /login when user is null and loading is false", async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue(
      createMockAuthState({ user: null, loading: false }),
    );

    const { router } = setupRouter();

    render(<RouterProvider router={router} />);

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe("/login");
      },
      { timeout: 800 },
    );

    expect(router.state.location.search.redirect).toBe("/dashboard");
  });

  it("shows loading screen when loading is true", async () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = createMockAuthState({ loading: true });
      return selector ? selector(state) : state;
    });

    vi.mocked(useAuthStore.getState).mockReturnValue(
      createMockAuthState({ loading: true }),
    );

    const { router } = setupRouter();

    render(<RouterProvider router={router} />);

    await waitFor(
      () => {
        expect(screen.getByText("Loading session...")).toBeInTheDocument();
      },
      { timeout: 600 },
    );

    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
  });

  it.skip("renders layout and protected content when authenticated", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = createMockAuthState({ user: mockUser, loading: false });
      return selector ? selector(state) : state;
    });

    vi.mocked(useAuthStore.getState).mockReturnValue(
      createMockAuthState({ user: mockUser, loading: false }),
    );

    const { router } = setupRouter();

    render(<RouterProvider router={router} />);

    await waitFor(
      () => {
        expect(screen.getByText("Do Tasks")).toBeInTheDocument();
        expect(screen.getByTestId("child-content")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it.skip("calls initialize when user is null and loading is false", async () => {
    const initializeMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = createMockAuthState({
        user: null,
        loading: false,
        initialize: initializeMock,
      });
      return selector ? selector(state) : state;
    });

    vi.mocked(useAuthStore.getState).mockReturnValue(
      createMockAuthState({
        user: null,
        loading: false,
        initialize: initializeMock,
      }),
    );

    const { router } = setupRouter();

    render(<RouterProvider router={router} />);

    await waitFor(
      () => {
        expect(initializeMock).toHaveBeenCalledTimes(1);
      },
      { timeout: 600 },
    );
  });

  it("does not redirect immediately when loading is true", async () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = createMockAuthState({ loading: true });
      return selector ? selector(state) : state;
    });

    vi.mocked(useAuthStore.getState).mockReturnValue(
      createMockAuthState({ loading: true }),
    );

    const { router } = setupRouter();

    render(<RouterProvider router={router} />);

    await new Promise((r) => setTimeout(r, 400));

    expect(router.state.location.pathname).not.toBe("/login");
    expect(screen.getByText("Loading session...")).toBeInTheDocument();
  });
});
