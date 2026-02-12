// src/trpc-vanilla.ts

import { createTRPCProxyClient, httpLink } from "@trpc/client";
import type { AppRouter } from "../server/trpc"; // ← adjust to your actual AppRouter location

export const vanillaTrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: "/trpc",
      // No custom fetch here — keep it minimal
      // You can add static headers if needed, but refreshToken.refresh is publicProcedure
    }),
  ],
});
