// __tests__/Navigation.test.tsx

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  RouterProvider,
  createRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
} from '@tanstack/react-router';
import { act } from 'react';

import Navigation from '../src/components/Navigation';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  HomeIcon: () => <div data-testid="home-icon" />,
  ScaleIcon: () => <div data-testid="scale-icon" />,
  LineChartIcon: () => <div data-testid="line-chart-icon" />,
  TargetIcon: () => <div data-testid="target-icon" />,
}));

describe('Navigation Component', () => {
  const createTestRouter = (initialPath = '/') => {
    const rootRoute = createRootRoute({
      component: Navigation,
    });

    const routeTree = rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: '/weight' }),
      createRoute({ getParentRoute: () => rootRoute, path: '/goals' }),
      createRoute({ getParentRoute: () => rootRoute, path: '/stats' }),
    ]);

    const history = createMemoryHistory({ initialEntries: [initialPath] });
    const router = createRouter({ routeTree, history });

    return { router, history };
  };

  const renderNavigation = async (initialPath = '/') => {
    const { router } = createTestRouter(initialPath);

    await act(async () => {
      render(<RouterProvider router={router} />);
    });

    return router.history;
  };

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders all navigation links with correct text, href, and icons', async () => {
    await renderNavigation('/');

    const weightLink = screen.getByRole('link', { name: /weight/i });
    const goalsLink  = screen.getByRole('link', { name: /goals/i });
    const statsLink  = screen.getByRole('link', { name: /stats/i });

    // Text content
    expect(weightLink).toHaveTextContent('Weight');
    expect(goalsLink).toHaveTextContent('Goals');
    expect(statsLink).toHaveTextContent('Stats');

    // href
    expect(weightLink).toHaveAttribute('href', '/weight');
    expect(goalsLink).toHaveAttribute('href', '/goals');
    expect(statsLink).toHaveAttribute('href', '/stats');

    // Icons
    expect(screen.getByTestId('scale-icon')).toBeInTheDocument();
    expect(screen.getByTestId('target-icon')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart-icon')).toBeInTheDocument();
  });

  it('applies active styles to the current route', async () => {
    await renderNavigation('/weight');

    const weightLink = screen.getByRole('link', { name: /weight/i });

    expect(weightLink).toHaveClass('font-semibold');
    expect(weightLink).toHaveClass('bg-muted');

    // Other links should not be active
    const goalsLink = screen.getByRole('link', { name: /goals/i });
    expect(goalsLink).not.toHaveClass('font-semibold');
    expect(goalsLink).not.toHaveClass('bg-muted');
  });

  it('navigates when a link is clicked', async () => {
    const history = await renderNavigation('/');

    const weightLink = screen.getByRole('link', { name: /weight/i });

    await act(async () => {
      fireEvent.click(weightLink);
    });

    expect(history.location.pathname).toBe('/weight');
  });
});