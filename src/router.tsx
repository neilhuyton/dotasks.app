import { createRouter } from "@tanstack/react-router";

import { getQueryClient } from "@/queryClient";
import { routeTree } from "./types/routeTree.gen";
import { RouteError } from "@steel-cut/steel-lib";
import { useUIStore } from "@/store/uiStore";

export interface RouterContext {
  queryClient: ReturnType<typeof getQueryClient>;
}

export const router = createRouter({
  routeTree,
  context: {
    queryClient: getQueryClient(),
  } satisfies RouterContext,

  defaultErrorComponent: ({ error, reset }) => (
    <RouteError error={error} reset={reset} />
  ),

  defaultPreload: () => {
    const isDragging = useUIStore.getState().isDragging;
    return isDragging ? false : "intent";
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
