// src/queryClient.ts

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../server/trpc";
import { useAuthStore } from "./store/authStore";
import { router } from "./router/router";
import { keepPreviousData } from "@tanstack/react-query";
import { get, set, del } from "idb-keyval";
import type {
  Persister,
  PersistedClient,
} from "@tanstack/react-query-persist-client";

// ────────────────────────────────────────────────
// IndexedDB Persister (properly typed, matches official examples)
// ────────────────────────────────────────────────
const CACHE_KEY = "my-app-query-cache-v1"; // Bump this string if you ever change cache shape

const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(CACHE_KEY, client);
  },

  restoreClient: async (): Promise<PersistedClient | undefined> => {
    return await get<PersistedClient>(CACHE_KEY);
  },

  removeClient: async () => {
    await del(CACHE_KEY);
  },
};

// ────────────────────────────────────────────────
// Your original QueryClient (unchanged except for the persistence integration)
// ────────────────────────────────────────────────
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      placeholderData: keepPreviousData,
      retry: 1, // Don't hammer slow DB
      // Optional: background indicators if you want subtle "updating..." text
      // background: { enabled: true, delay: 2000 },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
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

  if (!isUnauthorized) {
    return;
  }

  const { refreshToken } = useAuthStore.getState();

  // If we still have a refresh token → let the authRefreshLink try to recover
  // We only force logout here if there's literally no refresh token left
  if (refreshToken) {
    console.debug(
      "[QueryCache] Caught 401/UNAUTHORIZED but refresh token exists → letting authRefreshLink handle it",
    );
    return;
  }

  // No refresh token → this is a real unauthenticated state → logout
  console.warn("[QueryCache] No refresh token available → forcing logout");

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

// Export the persister so you can use it in your root provider
export { idbPersister };
