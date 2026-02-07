// __tests__/useVerifyEmail.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '../src/trpc';
import { server } from '../__mocks__/server';
import '@testing-library/jest-dom';
import { act } from 'react';
import { RouterProvider, createRouter, createMemoryHistory, useSearch } from '@tanstack/react-router';
import { router } from '../src/router/router';
import { verifyEmailHandler } from '../__mocks__/handlers/verifyEmail';
import { trpcClient, queryClient } from '../src/client';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...mod,
    useSearch: vi.fn(),
  };
});

describe('useVerifyEmail Hook', () => {
  const setup = async (initialPath = '/verify-email', search: Record<string, string> = {}) => {
    const queryString = new URLSearchParams(search).toString();
    const initialEntry = queryString ? `${initialPath}?${queryString}` : initialPath;
    const history = createMemoryHistory({ initialEntries: [initialEntry] });
    const testRouter = createRouter({
      routeTree: router.routeTree,
      history,
    });

    await act(async () => {
      render(
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={testRouter} />
          </QueryClientProvider>
        </trpc.Provider>
      );
    });

    return { history, testRouter };
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
    server.use(verifyEmailHandler);
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterAll(() => {
    server.close();
  });

  it('verifies email successfully with valid token', async () => {
    vi.mocked(useSearch).mockReturnValue({ token: '42c6b154-c097-4a71-9b34-5b28669ea467' });
    await setup('/verify-email', { token: '42c6b154-c097-4a71-9b34-5b28669ea467' });

    await act(async () => {
      await waitFor(
        () => {
          expect(screen.queryByTestId('verify-email-loading')).not.toBeInTheDocument();
          expect(screen.getByTestId('verify-message')).toHaveTextContent('Email verified successfully!');
          expect(screen.getByTestId('go-to-login-button')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  it('handles invalid token with error message', async () => {
    vi.mocked(useSearch).mockReturnValue({ token: '123e4567-e89b-12d3-a456-426614174000' });
    await setup('/verify-email', { token: '123e4567-e89b-12d3-a456-426614174000' });

    await act(async () => {
      await waitFor(
        () => {
          expect(screen.queryByTestId('verify-email-loading')).not.toBeInTheDocument();
          expect(screen.getByTestId('verify-message')).toHaveTextContent('Invalid or expired verification token');
        },
        { timeout: 5000 }
      );
    });
  });

  it('handles missing token', async () => {
    vi.mocked(useSearch).mockReturnValue({});
    await setup('/verify-email', {});

    await act(async () => {
      await waitFor(
        () => {
          expect(screen.queryByTestId('verify-email-loading')).not.toBeInTheDocument();
          expect(screen.getByTestId('verify-message')).toHaveTextContent('No verification token provided');
        },
        { timeout: 5000 }
      );
    });
  });
});