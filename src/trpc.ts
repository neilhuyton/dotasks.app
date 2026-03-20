import { createTrpcClient } from "@steel-cut/trpc-shared/client";
import type { AppRouter } from "../server/trpc";

import { getAccessToken } from "@/lib/auth/token";
import { safeRefreshSession } from "@/lib/supabase-utils";
import { getQueryClient } from "@/queryClient";
import {
  createTRPCContext,
  createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";

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
