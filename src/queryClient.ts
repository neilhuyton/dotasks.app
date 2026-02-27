// src/queryClient.ts

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../server/trpc";
import { useAuthStore } from "@/shared/store/authStore";
import { router } from "./router";

type TRPCErrorShape = NonNullable<TRPCClientError<AppRouter>["data"]>;

function isAuthError(err: unknown): err is TRPCClientError<AppRouter> {
  if (!(err instanceof TRPCClientError)) return false;

  const shape = err.data as TRPCErrorShape | undefined;

  return (
    shape?.code === "UNAUTHORIZED" ||
    shape?.httpStatus === 401 ||
    err.message.toLowerCase().includes("unauthorized") ||
    err.message.toLowerCase().includes("expired token") ||
    err.message.toLowerCase().includes("invalid token") ||
    err.message.toLowerCase().includes("jwt")
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    },
    mutations: {
      retry: false,
    },
  },

  queryCache: new QueryCache({
    onError: (error) => {
      handleTRPCAuthError(error);
    },
  }),

  mutationCache: new MutationCache({
    onError: (error) => {
      handleTRPCAuthError(error);
    },
  }),
});

function handleTRPCAuthError(error: unknown): void {
  if (!isAuthError(error)) return;

  const { refreshToken, logout } = useAuthStore.getState();

  if (refreshToken) {
    return;
  }

  logout();
  queryClient.clear();
  queryClient.cancelQueries();

  if (router.state.location.pathname !== "/login") {
    router.invalidate().finally(() => {
      router.navigate({ to: "/login", replace: true });
    });
  }
}
