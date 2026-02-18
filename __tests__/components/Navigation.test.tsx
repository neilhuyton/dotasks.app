// __tests__/Navigation.test.tsx

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import { act } from "react";

import Navigation from "@/components/Navigation";

// Mock lucide-react icons correctly – return actual mocked components
vi.mock("lucide-react", () => {
  return {
    ListTodo: () => <div data-testid="list-todo-icon" />,
    ListChecks: () => <div data-testid="list-checks-icon" />,
    User: () => <div data-testid="user-icon" />,
  };
});

describe("Navigation Component", () => {
  const createTestRouter = (initialPath = "/") => {
    const rootRoute = createRootRoute({
      component: Navigation,
    });

    const routeTree = rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/page1",
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/page2",
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/page3",
      }),
    ]);

    const history = createMemoryHistory({ initialEntries: [initialPath] });
    const router = createRouter({ routeTree, history });

    return { router, history };
  };

  const renderNavigation = async (initialPath = "/") => {
    const { router } = createTestRouter(initialPath);

    await act(async () => {
      render(<RouterProvider router={router} />);
    });

    return router.history;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all navigation links with correct text, href, and icons", async () => {
    await renderNavigation("/");

    // Find links by accessible name (aria-label)
    const todayLink = screen.getByRole("link", { name: "Today" });
    const listsLink = screen.getByRole("link", { name: "Lists" });
    const meLink = screen.getByRole("link", { name: "Me" });

    expect(todayLink).toHaveTextContent("Today");
    expect(listsLink).toHaveTextContent("Lists");
    expect(meLink).toHaveTextContent("Me");

    expect(todayLink).toHaveAttribute("href", "/");
    expect(listsLink).toHaveAttribute("href", "/lists");
    expect(meLink).toHaveAttribute("href", "/profile");

    // Icons
    expect(screen.getByTestId("list-todo-icon")).toBeInTheDocument();
    expect(screen.getByTestId("list-checks-icon")).toBeInTheDocument();
    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
  });

  it("applies active styles to the current route", async () => {
    await renderNavigation("/");

    const todayLink = screen.getByRole("link", { name: "Today" });

    expect(todayLink).toHaveClass("font-semibold");
    expect(todayLink).toHaveClass("bg-muted");

    const listsLink = screen.getByRole("link", { name: "Lists" });
    expect(listsLink).not.toHaveClass("font-semibold");
    expect(listsLink).not.toHaveClass("bg-muted");

    const meLink = screen.getByRole("link", { name: "Me" });
    expect(meLink).not.toHaveClass("font-semibold");
    expect(meLink).not.toHaveClass("bg-muted");
  });

  it("navigates when a link is clicked", async () => {
    const history = await renderNavigation("/");

    const listsLink = screen.getByRole("link", { name: "Lists" });

    await act(async () => {
      listsLink.click();
    });

    expect(history.location.pathname).toBe("/lists");
  });
});
