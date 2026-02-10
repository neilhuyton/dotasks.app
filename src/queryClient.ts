// src/queryClient.ts

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../server/trpc";
import { useAuthStore } from "./store/authStore";
import { router } from "./router/router";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },

  // Global error handling for all queries
  queryCache: new QueryCache({
    onError: (error) => {
      handleTRPCAuthError(error);
    },
  }),

  // Global error handling for all mutations
  mutationCache: new MutationCache({
    onError: (error) => {
      handleTRPCAuthError(error);
    },
  }),
});

// Shared helper function to avoid duplication
function handleTRPCAuthError(error: unknown): void {
  // Use the base (non-generic) class for instanceof check
  if (!(error instanceof TRPCClientError)) {
    return;
  }

  // Safe to cast once we know it's a TRPCClientError
  const err = error as TRPCClientError<AppRouter>;

  const isUnauthorized =
    err.data?.code === "UNAUTHORIZED" ||
    err.data?.httpStatus === 401 ||
    err.message.toLowerCase().includes("unauthorized") ||
    err.message.toLowerCase().includes("expired") ||
    err.message.toLowerCase().includes("invalid token") ||
    err.message.toLowerCase().includes("jwt");

  if (isUnauthorized) {
    useAuthStore.getState().logout();
    queryClient.clear();
    queryClient.cancelQueries();

    // Prevent redirect loop if already on login
    if (router.state.location.pathname !== "/login") {
      router.invalidate().finally(() => {
        router.navigate({ to: "/login", replace: true });
      });
    }
  }
}