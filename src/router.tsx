// src/router/router.tsx

import { createRouter } from "@tanstack/react-router";

import { getQueryClient } from "@/queryClient";
import { routeTree } from "./types/routeTree.gen";

export interface RouterContext {
  queryClient: ReturnType<typeof getQueryClient>;
}

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: {
    queryClient: getQueryClient(),
  } satisfies RouterContext,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
