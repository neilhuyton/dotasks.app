import { createTrpcClient } from "@steel-cut/trpc-shared/client";
import type { AppRouter } from "../server/trpc";

import { safeRefreshSession } from "@/lib/supabase-utils";
import { useAuthStore } from "@/store/authStore";
import { getQueryClient } from "@/queryClient";
import {
  createTRPCContext,
  createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";

let lastRefreshFailed = false;

const getAccessToken = async (): Promise<string | null> => {
  const state = useAuthStore.getState();

  if (lastRefreshFailed) {
    return null;
  }

  if (state.session?.access_token) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = state.session.expires_at ?? 0;

    if (expiresAt - now >= 120) {
      return state.session.access_token;
    }
  }

  try {
    const { data, error } = await safeRefreshSession();

    if (error || !data.session?.access_token) {
      lastRefreshFailed = true;
      useAuthStore.getState().signOut?.();
      return null;
    }

    lastRefreshFailed = false;
    return data.session.access_token;
  } catch {
    lastRefreshFailed = true;
    useAuthStore.getState().signOut?.();
    return null;
  }
};

export const trpcClient = createTrpcClient<AppRouter>({
  getAccessToken,
  refreshSession: safeRefreshSession,
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: getQueryClient(),
});

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
