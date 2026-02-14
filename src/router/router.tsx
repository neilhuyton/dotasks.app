// src/router/router.tsx

import { createRouter } from "@tanstack/react-router";

import { rootRoute } from "./rootRoute";
import { authenticatedRoute } from "./_authenticated";

import {
  registerRoute,
  loginRoute,
  resetPasswordRoute,
  confirmResetPasswordRoute,
  verifyEmailRoute,
  homeRedirectRoute,
  listsIndexRoute,
  listDetailRoute,
  profileRoute,
} from "./routes";

import { queryClient } from "@/queryClient";
import { trpcClient } from "@/client";

// Protected subtree
const protectedRoutes = authenticatedRoute.addChildren([
  homeRedirectRoute,
  listsIndexRoute,
  listDetailRoute,
  profileRoute,
]);

// Full tree
export const routeTree = rootRoute.addChildren([
  registerRoute,
  loginRoute,
  resetPasswordRoute,
  confirmResetPasswordRoute,
  verifyEmailRoute,
  protectedRoutes,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: { queryClient, trpcClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
