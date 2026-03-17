import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";

import { QueryClient } from "@tanstack/react-query";
import type { RouterContext } from "@/router";

import { useAuthStore } from "@/store/authStore";

vi.mock("@/store/authStore", () => ({
  useAuthStore: vi.fn(),
}));

describe("Root Route (__root.tsx)", () => {
  const createMockContext = (
    extra: Record<string, unknown> = {},
  ): RouterContext => ({
    queryClient: new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    }),
    ...extra,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Navigation when logged in", async () => {
    vi.mocked(useAuthStore).mockReturnValue(true);

    const rootRoute = createRootRouteWithContext<RouterContext>()({
      component: () => (
        <>
          <nav data-testid="navigation">Navigation</nav>
          <Outlet />
        </>
      ),
    });

    const dummyChildRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => (
        <div data-testid="child-content">Hello from child route</div>
      ),
    });

    const routeTree = rootRoute.addChildren([dummyChildRoute]);

    const history = createMemoryHistory({ initialEntries: ["/"] });

    const router = createRouter({
      routeTree,
      history,
      context: createMockContext(),
      defaultPendingMinMs: 0,
      defaultPreloadStaleTime: 0,
    });

    await router.load();
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(router.state.status).toBe("idle"));

    expect(screen.getByTestId("navigation")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("does not render Navigation when not logged in", async () => {
    vi.mocked(useAuthStore).mockReturnValue(false);

    const rootRoute = createRootRouteWithContext<RouterContext>()({
      component: () => (
        <>
          <Outlet />
        </>
      ),
    });

    const dummyChildRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => (
        <div data-testid="child-content">Hello from child route</div>
      ),
    });

    const routeTree = rootRoute.addChildren([dummyChildRoute]);

    const history = createMemoryHistory({ initialEntries: ["/"] });

    const router = createRouter({
      routeTree,
      history,
      context: createMockContext(),
      defaultPendingMinMs: 0,
      defaultPreloadStaleTime: 0,
    });

    await router.load();
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(router.state.status).toBe("idle"));

    expect(screen.queryByTestId("navigation")).not.toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("always renders Outlet", async () => {
    vi.mocked(useAuthStore).mockReturnValue(false);

    const rootRoute = createRootRouteWithContext<RouterContext>()({
      component: () => <Outlet />,
    });

    const dummyChildRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => (
        <div data-testid="child-content">Hello from child route</div>
      ),
    });

    const routeTree = rootRoute.addChildren([dummyChildRoute]);

    const history = createMemoryHistory({ initialEntries: ["/"] });

    const router = createRouter({
      routeTree,
      history,
      context: createMockContext(),
      defaultPendingMinMs: 0,
      defaultPreloadStaleTime: 0,
    });

    await router.load();
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(router.state.status).toBe("idle"));

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});
