// __tests__/GoalList.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '../src/trpc';
import { server } from '../__mocks__/server';
import '@testing-library/jest-dom';
import { act } from 'react';
import GoalList from '../src/components/GoalList';
import { useAuthStore } from '../src/store/authStore';
import { weightGetGoalsHandler } from '../__mocks__/handlers/weightGetGoals';
import { generateToken } from './utils/token';

// Mock lucide-react for LoadingSpinner
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loading-spinner" />,
}));

// Mock jwt-decode
vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn((token: string) => {
    const payload = token.split('.')[1];
    if (!payload) throw new Error('Invalid token');
    const decoded = JSON.parse(atob(payload)) as { userId: string; iat?: number; exp?: number };
    if (['test-user-id', 'empty-user-id', 'error-user-id', 'invalid-user-id'].includes(decoded.userId)) {
      return decoded;
    }
    throw new Error('Invalid token');
  }),
}));

describe('GoalList Component', () => {
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
        fetch: async (url, options) => {
          const headers = {
            'content-type': 'application/json',
            ...(useAuthStore.getState().token
              ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
              : {}),
          };
          const body = options?.body || JSON.stringify([{ id: 0, method: 'query', path: 'weight.getGoals' }]);
          const response = await fetch(url, {
            ...options,
            headers,
            method: 'POST',
            body,
          });
          return response;
        },
      }),
    ],
  });

  const setup = async (userId: string | null = 'test-user-id') => {
    useAuthStore.setState({
      isLoggedIn: !!userId,
      userId,
      token: userId ? generateToken(userId) : null,
      refreshToken: userId ? 'valid-refresh-token' : null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    await act(async () => {
      render(
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <GoalList />
          </QueryClientProvider>
        </trpc.Provider>
      );
    });
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
    server.use(weightGetGoalsHandler);
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

  it('renders loading state while fetching goals', async () => {
    server.use(weightGetGoalsHandler);
    await setup('test-user-id');

    expect(screen.getByTestId('goal-list-loading')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByTestId('goal-list-loading')).not.toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
      },
      { timeout: 1000, interval: 50 }
    );
  });

  it('displays goals in a table when data is available', async () => {
    server.use(weightGetGoalsHandler);
    await setup('test-user-id');

    await waitFor(
      () => {
        expect(screen.queryByTestId('goal-list-loading')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Past Weight Goals' })).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('A list of your past weight goals.')).toBeInTheDocument();
        expect(screen.getByText('Goal Weight (kg)')).toBeInTheDocument();
        expect(screen.getByText('Set Date')).toBeInTheDocument();
        expect(screen.getByText('Reached Date')).toBeInTheDocument();
        expect(screen.getByText('65.0')).toBeInTheDocument();
        expect(screen.getByText('70.0')).toBeInTheDocument();
        expect(screen.getByText('Not Reached')).toBeInTheDocument();
        expect(screen.getByText('28/08/2025')).toBeInTheDocument();
        const dateCells = screen.getAllByText('27/08/2025');
        expect(dateCells).toHaveLength(2); // Appears in Set Date and Reached Date for second goal
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      },
      { timeout: 1000, interval: 50 }
    );

    const tableHeaders = screen.getAllByRole('columnheader');
    expect(tableHeaders[0]).toHaveClass('font-bold bg-muted/50');
    expect(tableHeaders[1]).toHaveClass('font-bold bg-muted/50');
    expect(tableHeaders[2]).toHaveClass('font-bold bg-muted/50');

    const tableRows = screen.getAllByRole('row');
    expect(tableRows[0]).toHaveClass('hover:bg-muted/50 rounded-t-lg');
    expect(tableRows[2]).toHaveClass('hover:bg-muted/50 rounded-b-lg');
  });

  it("displays 'No weight goals found' when goals array is empty", async () => {
    server.use(weightGetGoalsHandler);
    await setup('empty-user-id');

    await waitFor(
      () => {
        expect(screen.queryByTestId('goal-list-loading')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Past Weight Goals' })).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('A list of your past weight goals.')).toBeInTheDocument();
        expect(screen.getByText('No weight goals found')).toBeInTheDocument();
        expect(screen.getByRole('cell')).toHaveAttribute('colSpan', '3');
      },
      { timeout: 1000, interval: 50 }
    );
  });

  it('displays error message when fetch fails', async () => {
    server.use(weightGetGoalsHandler);
    await setup('error-user-id');

    await waitFor(
      () => {
        expect(screen.queryByTestId('goal-list-loading')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Past Weight Goals' })).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Error: Failed to fetch goals');
        expect(screen.getByTestId('error-message')).toHaveClass('text-destructive');
      },
      { timeout: 1000, interval: 50 }
    );
  });
});