// __tests__/WeightChart.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '../src/trpc';
import { server } from '../__mocks__/server';
import '@testing-library/jest-dom';
import { act } from 'react';
import WeightChart from '../src/components/WeightChart';
import { useAuthStore } from '../src/store/authStore';
import { generateToken } from './utils/token';
import { weightGetWeightsHandler, weightGetCurrentGoalHandler } from '../__mocks__/handlers';

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: () => <div data-testid="loading-spinner" />,
    ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  };
});

describe('WeightChart Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:8888/.netlify/functions/trpc',
        maxItems: 1,
        fetch: async (url, options) => {
          const headers = {
            'content-type': 'application/json',
            ...(useAuthStore.getState().token
              ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
              : {}),
          };

          // Provide a default body if none is provided
          const defaultBody = JSON.stringify([
            { id: 0, method: 'query', path: 'weight.getWeights' },
            { id: 1, method: 'query', path: 'weight.getCurrentGoal' },
          ]);
          const body = typeof options?.body === 'string' ? options.body : defaultBody;

          const response = await fetch(url, {
            ...options,
            headers,
            method: 'POST',
            body,
          });

          // Do not consume response body here; let msw handle it
          return response;
        },
      }),
    ],
  });

  const setup = async (userId = 'test-user-id') => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId,
      token: generateToken(userId),
      refreshToken: 'valid-refresh-token',
      login: vi.fn(),
      logout: vi.fn(),
    });

    await act(async () => {
      render(
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <WeightChart />
          </QueryClientProvider>
        </trpc.Provider>
      );
    });
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
    server.use(weightGetWeightsHandler, weightGetCurrentGoalHandler);
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      token: null,
      refreshToken: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  afterAll(() => {
    server.close();
  });

  it('renders WeightChart with correct title and select dropdown', async () => {
    await setup();
    await waitFor(() => {
      expect(screen.getByTestId('unit-select')).toHaveTextContent('Daily');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Your Stats'
      );
    });
  });

  it('displays error message when fetch fails', async () => {
    await setup('error-user-id');
    await waitFor(
      () => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
        expect(screen.getByTestId('error')).toHaveTextContent(
          'Error: Failed to fetch weights'
        );
      },
      { timeout: 500 }
    );
  });

  it('displays no measurements message when weights are empty', async () => {
    await setup('empty-user-id');
    await waitFor(
      () => {
        expect(screen.getByTestId('no-data')).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('updates chart data when trend period changes', async () => {
    await setup();
    await waitFor(
      () => {
        expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
      },
      { timeout: 500 }
    );

    await act(async () => {
      const select = screen.getByTestId('unit-select');
      fireEvent.change(select, { target: { value: 'weekly' } });
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('displays latest weight card when weights are available', async () => {
    await setup();
    await waitFor(
      () => {
        expect(screen.getByTestId('latest-weight-card')).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('does not display latest weight card when weights are empty', async () => {
    await setup('empty-user-id');
    await waitFor(
      () => {
        expect(screen.getByTestId('no-data')).toBeInTheDocument();
        expect(screen.queryByTestId('latest-weight-card')).not.toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('displays goal weight card when goal is available', async () => {
    await setup();
    await waitFor(
      () => {
        expect(screen.getByTestId('goal-weight-card')).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('does not display goal weight card when no goal exists', async () => {
    await setup('empty-user-id');
    await waitFor(
      () => {
        expect(screen.getByTestId('no-data')).toBeInTheDocument();
        expect(screen.queryByTestId('goal-weight-card')).not.toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });
});