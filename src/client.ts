// src/client.ts

import {
  createTRPCClient,
  httpBatchLink,
  TRPCClientError,
  type TRPCLink,
} from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AnyRouter } from '@trpc/server';
import type { Operation, OperationResultObservable } from '@trpc/client';

import type { AppRouter } from '../server/trpc';

import { vanillaTrpc } from './trpc-vanilla';
import { useAuthStore } from './store/authStore';
import { queryClient } from './queryClient';
import { router } from './router/router';

let activeRefreshPromise: Promise<void> | null = null;

const authRefreshLink: TRPCLink<AppRouter> = () => {
  return ({ op, next }) =>
    observable((observer) => {
      const subscription = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (err instanceof TRPCClientError && err.data?.code === 'UNAUTHORIZED') {
            handleAuthError(err, observer, next, op);
          } else {
            observer.error(err);
          }
        },
        complete() {
          observer.complete();
        },
      });

      return () => subscription.unsubscribe();
    });
};

function handleAuthError(
  originalErr: TRPCClientError<AppRouter>,
  observer: Parameters<
    NonNullable<OperationResultObservable<AnyRouter, unknown>['subscribe']>
  >[0],
  next: (op: Operation) => OperationResultObservable<AnyRouter, unknown>,
  op: Operation,
) {
  console.log('[TRPC Auth] Caught UNAUTHORIZED → attempting refresh');

  const state = useAuthStore.getState();
  const { refreshToken, userId } = state;

  if (!refreshToken || !userId) {
    console.warn('[TRPC Auth] Missing refresh token or userId → logout');
    performLogout();
    observer.error?.(originalErr);
    return;
  }

  if (activeRefreshPromise) {
    activeRefreshPromise
      .then(() => retryOriginalOp(next, op, observer))
      .catch(() => observer.error?.(originalErr));
    return;
  }

  activeRefreshPromise = (async () => {
    try {
      const result = await vanillaTrpc.refreshToken.refresh.mutate({
        refreshToken,
      });

      console.log('[TRPC Auth] Refresh succeeded');

      useAuthStore.getState().login(userId, result.accessToken, result.refreshToken);

      retryOriginalOp(next, op, observer);
    } catch (refreshErr: unknown) {
      console.error('[TRPC Auth] Refresh failed', refreshErr);

      let clientError: TRPCClientError<AppRouter>;

      if (refreshErr instanceof TRPCClientError) {
        clientError = refreshErr;
      } else if (refreshErr instanceof Error) {
        clientError = new TRPCClientError(refreshErr.message || 'Refresh failed', {
          cause: refreshErr,
        });
      } else {
        clientError = new TRPCClientError('Refresh failed (unknown)');
      }

      const code = clientError.data?.code;
      const message = clientError.message;

      const isFatal =
        code === 'UNAUTHORIZED' ||
        code === 'FORBIDDEN' ||
        (code === 'BAD_REQUEST' && message.includes('Invalid refresh token format'));

      if (isFatal) {
        console.warn(
          `[TRPC Auth] Fatal refresh error (${code}): ${message} → logging out`,
        );
        performLogout();
      }

      observer.error?.(clientError);
    } finally {
      activeRefreshPromise = null;
    }
  })();
}

function retryOriginalOp(
  next: (op: Operation) => OperationResultObservable<AnyRouter, unknown>,
  op: Operation,
  observer: Parameters<
    NonNullable<OperationResultObservable<AnyRouter, unknown>['subscribe']>
  >[0],
) {
  next(op).subscribe({
    next(value) {
      observer.next?.(value);
    },
    error(err) {
      observer.error?.(err);
    },
    complete() {
      observer.complete?.();
    },
  });
}

function performLogout() {
  useAuthStore.getState().logout();
  queryClient.clear();
  queryClient.cancelQueries();
  router.navigate({ to: '/login', replace: true });
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    authRefreshLink,
    httpBatchLink({
      url: '/trpc',
      headers() {
        const { accessToken } = useAuthStore.getState();
        return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      },
    }),
  ],
});