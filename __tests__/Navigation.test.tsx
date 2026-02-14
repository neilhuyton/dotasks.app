// __tests__/Navigation.test.tsx

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  RouterProvider,
  createRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import { act } from "react";

import Navigation from "../src/components/Navigation";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ScaleIcon: () => <div data-testid="scale-icon" />,
  LineChartIcon: () => <div data-testid="line-chart-icon" />,
  TargetIcon: () => <div data-testid="target-icon" />,
}));

describe("Navigation Component", () => {
  const createTestRouter = (initialPath = "/") => {
    const rootRoute = createRootRoute({
      component: Navigation,
    });

    const routeTree = rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: "/page1" }),
      createRoute({ getParentRoute: () => rootRoute, path: "/page2" }),
      createRoute({ getParentRoute: () => rootRoute, path: "/page3" }),
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
    document.body.innerHTML = "";
  });

  it("renders all navigation links with correct text, href, and icons", async () => {
    await renderNavigation("/");

    const page1Link = screen.getByRole("link", { name: "Navigate to Page 1" });
    const page2Link = screen.getByRole("link", { name: "Navigate to Page 2" });
    const page3Link = screen.getByRole("link", { name: "Navigate to Page 3" });

    // Text content (still checks visible text)
    expect(page1Link).toHaveTextContent("Page 1");
    expect(page2Link).toHaveTextContent("Page 2");
    expect(page3Link).toHaveTextContent("Page 3");

    // href
    expect(page1Link).toHaveAttribute("href", "/page1");
    expect(page2Link).toHaveAttribute("href", "/page2");
    expect(page3Link).toHaveAttribute("href", "/page3");

    // Icons
    expect(screen.getByTestId("scale-icon")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart-icon")).toBeInTheDocument();
    expect(screen.getByTestId("target-icon")).toBeInTheDocument();
  });

  it("applies active styles to the current route", async () => {
    await renderNavigation("/page1");

    const page1Link = screen.getByRole("link", { name: "Navigate to Page 1" });

    expect(page1Link).toHaveClass("font-semibold");
    expect(page1Link).toHaveClass("bg-muted");

    // Other links should not be active
    const page2Link = screen.getByRole("link", { name: "Navigate to Page 2" });
    expect(page2Link).not.toHaveClass("font-semibold");
    expect(page2Link).not.toHaveClass("bg-muted");

    const page3Link = screen.getByRole("link", { name: "Navigate to Page 3" });
    expect(page3Link).not.toHaveClass("font-semibold");
    expect(page3Link).not.toHaveClass("bg-muted");
  });

  it("navigates when a link is clicked", async () => {
    const history = await renderNavigation("/");

    const page3Link = screen.getByRole("link", { name: "Navigate to Page 3" });

    await act(async () => {
      fireEvent.click(page3Link);
    });

    expect(history.location.pathname).toBe("/page3");
  });
});
