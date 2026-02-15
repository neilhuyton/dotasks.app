// src/router/router.tsx

import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./rootRoute";

import {
  registerRoute,
  loginRoute,
  resetPasswordRoute,
  confirmResetPasswordRoute,
  verifyEmailRoute,
  protectedRoutes,
} from "./routes";

import { queryClient } from "@/queryClient";
import { trpcClient } from "@/client";

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
