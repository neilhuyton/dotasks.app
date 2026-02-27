// src/router/router.tsx

import { createRouter } from "@tanstack/react-router";

import { queryClient } from "@/queryClient";
import { routeTree } from "./types/routeTree.gen";

export interface RouterContext {
  queryClient: typeof queryClient;
}

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: {
    queryClient,
  } satisfies RouterContext,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
