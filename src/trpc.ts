// src/trpc.ts

import { createTRPCClient, httpLink } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import {
  createTRPCContext,
  createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import type { AppRouter } from "../server/trpc";

import { safeGetSession, safeRefreshSession } from "@/lib/supabase-utils";
import { getQueryClient } from "@/queryClient";
import { useAuthStore } from "@/store/authStore";

let isRefreshing = false;
let refreshPromise: Promise<unknown> | null = null;

const dedupedRefresh = (): Promise<unknown> => {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = safeRefreshSession().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });
  return refreshPromise;
};

const refreshOn401Link = (): TRPCLink<AppRouter> => {
  return () =>
    ({ op, next }) =>
      observable((observer) => {
        const sub = next(op).subscribe({
          next: (res) => observer.next(res),
          error: (err) => {
            if (
              err instanceof TRPCClientError &&
              (err.data?.code === "UNAUTHORIZED" ||
                err.message?.includes("UNAUTHORIZED") ||
                err.data?.httpStatus === 401)
            ) {
              dedupedRefresh()
                .then(() => next(op).subscribe(observer))
                .catch(() => observer.error(err));
            } else {
              observer.error(err);
            }
          },
          complete: () => observer.complete(),
        });
        return () => sub.unsubscribe();
      });
};

const REFRESH_THRESHOLD_SECONDS = 120;

const needsRefresh = (expiresAt: number | null | undefined): boolean => {
  if (!expiresAt) return true;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now < REFRESH_THRESHOLD_SECONDS;
};

const getFreshAccessToken = async (): Promise<string | null> => {
  const storeSession = useAuthStore.getState().session;

  if (storeSession?.access_token) {
    if (needsRefresh(storeSession.expires_at)) {
      await safeRefreshSession();
      return useAuthStore.getState().session?.access_token ?? null;
    }
    return storeSession.access_token;
  }

  const {
    data: { session },
  } = await safeGetSession();
  if (!session?.access_token) return null;

  if (needsRefresh(session.expires_at)) {
    const { data: refreshed } = await safeRefreshSession();
    return refreshed.session?.access_token ?? null;
  }

  return session.access_token;
};

export function createTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      refreshOn401Link(),
      httpLink({
        url: "/trpc",
        async headers() {
          try {
            const token = await getFreshAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          } catch (err) {
            console.warn("[tRPC headers] Failed to get token", err);
            return {};
          }
        },
      }),
    ],
  });
}

export const trpcClient = createTrpcClient();

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: getQueryClient(),
});

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
