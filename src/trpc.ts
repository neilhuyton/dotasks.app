// src/trpc.ts

import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  TRPCClientError,
  type TRPCLink,
  type Operation,
  type OperationResultObservable,
} from "@trpc/client";
import { observable } from "@trpc/server/observable";

import {
  createTRPCContext,
  createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import type { AppRouter } from "../server/trpc";

import { useAuthStore } from "@/shared/store/authStore";
import { queryClient } from "@/queryClient";
import { router } from "@/router";

// ────────────────────────────────────────────────
// Auth refresh logic
// ────────────────────────────────────────────────

let activeRefreshPromise: Promise<void> | null = null;

const authRefreshLink: TRPCLink<AppRouter> = () => {
  return ({ op, next }) =>
    observable((observer) => {
      const subscription = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (
            err instanceof TRPCClientError &&
            err.data?.code === "UNAUTHORIZED"
          ) {
            handleAuthError(err, op, next, observer);
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

type LinkObserver = Parameters<
  OperationResultObservable<AppRouter, unknown>["subscribe"]
>[0];

function handleAuthError(
  originalError: TRPCClientError<AppRouter>,
  op: Operation,
  next: (op: Operation) => OperationResultObservable<AppRouter, unknown>,
  observer: LinkObserver,
) {
  if (activeRefreshPromise) {
    activeRefreshPromise
      .then(() => retryOperation(op, next, observer))
      .catch(() => observer.error!(originalError));
    return;
  }

  activeRefreshPromise = (async () => {
    // Always read fresh state here — avoids stale closure over initial null user
    const state = useAuthStore.getState();
    const { refreshToken, userId, user } = state;

    if (!refreshToken || !userId || !user?.email) {
      console.warn(
        "Refresh skipped: missing refreshToken, userId, or user.email",
      );
      performLogout();
      observer.error!(originalError);
      return;
    }

    try {
      const result = (await trpcClient.refreshToken.refresh.mutate({
        refreshToken,
      })) as { accessToken: string; refreshToken: string };

      useAuthStore.getState().login(
        userId,
        user.email,
        result.accessToken,
        result.refreshToken,
      );

      retryOperation(op, next, observer);
    } catch (err: unknown) {
      const refreshError = normalizeRefreshError(err);

      const isFatal =
        refreshError.data?.code === "UNAUTHORIZED" ||
        refreshError.data?.code === "FORBIDDEN" ||
        (refreshError.data?.code === "BAD_REQUEST" &&
          refreshError.message
            ?.toLowerCase()
            .includes("invalid refresh token"));

      if (isFatal) {
        performLogout();
      }

      observer.error!(refreshError);
    } finally {
      activeRefreshPromise = null;
    }
  })();
}

function retryOperation(
  op: Operation,
  next: (op: Operation) => OperationResultObservable<AppRouter, unknown>,
  observer: LinkObserver,
) {
  const subscription = next(op).subscribe({
    next(value) {
      observer.next!(value);
    },
    error(err) {
      observer.error!(err);
    },
    complete() {
      observer.complete!();
    },
  });

  return () => subscription.unsubscribe();
}

function normalizeRefreshError(err: unknown): TRPCClientError<AppRouter> {
  if (err instanceof TRPCClientError) {
    return err;
  }

  const message = err instanceof Error ? err.message : "Token refresh failed";
  return new TRPCClientError(
    message,
    err instanceof Error ? { cause: err } : undefined,
  );
}

function performLogout() {
  useAuthStore.getState().logout();
  queryClient.clear();
  queryClient.cancelQueries();

  if (router.state.location.pathname !== "/login") {
    void router.navigate({ to: "/login", replace: true });
  }
}

// ────────────────────────────────────────────────
// TRPC Client
// ────────────────────────────────────────────────

export function createTrpcClient() {
  const isTest = import.meta.env.MODE === "test";
  const baseUrl = isTest ? "http://localhost:8888" : "";

  return createTRPCClient<AppRouter>({
    links: [
      ...(isTest ? [] : [authRefreshLink]),
      isTest
        ? httpLink({
            url: `${baseUrl}/trpc`,
            headers() {
              const token = useAuthStore.getState().accessToken;
              return token ? { Authorization: `Bearer ${token}` } : {};
            },
          })
        : httpBatchLink({
            url: `${baseUrl}/trpc`,
            headers() {
              const token = useAuthStore.getState().accessToken;
              return token ? { Authorization: `Bearer ${token}` } : {};
            },
          }),
    ],
  });
}

export const trpcClient = createTrpcClient();

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
