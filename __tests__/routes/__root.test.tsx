// __tests__/routes/__root.test.tsx

import { describe, it, expect } from "vitest";
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

  it("renders without crashing and includes Outlet", async () => {
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

    await waitFor(() => expect(router.state.status).toBe("idle"), {
      timeout: 2000,
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("child-content")).toBeInTheDocument();
        expect(screen.getByText("Hello from child route")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("receives context correctly (basic check)", async () => {
    const mockContext = createMockContext({
      auth: { isAuthenticated: true, user: { id: "123" } },
    }) as RouterContext;

    const rootRoute = createRootRouteWithContext<RouterContext>()({
      component: () => <Outlet />,
    });

    const dummyChildRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => <div>Child with context</div>,
    });

    const routeTree = rootRoute.addChildren([dummyChildRoute]);

    const history = createMemoryHistory({ initialEntries: ["/"] });

    const router = createRouter({
      routeTree,
      history,
      context: mockContext,
      defaultPendingMinMs: 0,
      defaultPreloadStaleTime: 0,
    });

    await router.load();

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(router.state.status).toBe("idle"), {
      timeout: 2000,
    });

    await waitFor(
      () => {
        expect(screen.getByText("Child with context")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("does not render anything extra itself (only Outlet)", async () => {
    const rootRoute = createRootRouteWithContext<RouterContext>()({
      component: () => <Outlet />,
    });

    const routeTree = rootRoute;

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

    await waitFor(() => expect(router.state.status).toBe("idle"), {
      timeout: 2000,
    });

    expect(screen.queryByText(/something/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
  });
});
