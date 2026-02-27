// src/queryClient.ts
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../server/trpc";
import { useAuthStore } from "@/shared/store/authStore";
import { router } from "./router";

type TRPCErrorData = NonNullable<TRPCClientError<AppRouter>["data"]>;

function isAuthError(error: unknown): error is TRPCClientError<AppRouter> {
  if (!(error instanceof TRPCClientError)) return false;

  const data = error.data as TRPCErrorData | undefined;

  return (
    data?.code === "UNAUTHORIZED" ||
    data?.httpStatus === 401 ||
    error.message.toLowerCase().includes("unauthorized") ||
    error.message.toLowerCase().includes("expired token") ||
    error.message.toLowerCase().includes("invalid token") ||
    error.message.toLowerCase().includes("jwt")
  );
}

function handleTRPCAuthError(error: unknown): void {
  if (!isAuthError(error)) return;

  const { refreshToken, userId, logout } = useAuthStore.getState();

  if (refreshToken && userId) {
    // TODO: Attempt refresh here (or rely on tRPC link for this)
    // If refresh fails → proceed to logout below
    // For now, assuming refresh is handled in tRPC client link
  }

  // Fatal: no refresh possible or refresh failed → logout
  logout();
  queryClient.clear();
  queryClient.cancelQueries();

  // Only navigate if not already on login (avoid loops)
  if (router.state.location.pathname !== "/login") {
    router.invalidate().finally(() => {
      router.navigate({ to: "/login", replace: true });
    });
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,               // always stale → refetch often
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,                   // low retry for quick failure feedback
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: false,               // mutations usually shouldn't retry
    },
  },

  queryCache: new QueryCache({
    onError: (error) => {
      // Optional: only handle background errors differently
      // if (query.state.data !== undefined) { /* background refetch failed */ }
      handleTRPCAuthError(error);
    },
  }),

  mutationCache: new MutationCache({
    onError: (error) => {
      handleTRPCAuthError(error);
    },
  }),
});