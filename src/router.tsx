// src/router/router.tsx

import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen"; // ← correct relative import (from src/router/ → src/routeTree.gen.ts)

import { queryClient } from "@/queryClient";
import { trpcClient } from "@/client";

// Create the router instance with your context and options
export const router = createRouter({
  routeTree,
  defaultPreload: "intent", // preload on hover/intent (your original setting)
  context: {
    queryClient,
    trpcClient,
  },
  // Optional extras you might want later (uncomment as needed):
  // defaultPendingComponent: () => <div>Loading...</div>,
  // defaultErrorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

// Register the router for full type safety (Link, useNavigate, etc.)
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
