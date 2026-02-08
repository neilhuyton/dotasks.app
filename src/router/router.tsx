// src/router/router.tsx
import { createRouter, createRootRoute } from "@tanstack/react-router";
import Root from "../components/Root";
import { queryClient, trpcClient } from "../client";
import {
  homeRoute,
  registerRoute,
  loginRoute,
  resetPasswordRoute,
  confirmResetPasswordRoute,
  weightRoute,
  weightChartRoute,
  weightGoalRoute,
  verifyEmailRoute,
  profileRoute,
} from "./routes";

// 1. Create root route **without** relying on Register yet
const rootRoute = createRootRoute<unknown>({
  component: () => <Root queryClient={queryClient} trpcClient={trpcClient} />,
  errorComponent: (props) => (
    <div>
      An error occurred. Please try again. {JSON.stringify(props.error)}
    </div>
  ),
});

// 2. Build the tree
export const routeTree = rootRoute.addChildren([
  homeRoute(rootRoute),
  registerRoute(rootRoute),
  loginRoute(rootRoute),
  resetPasswordRoute(rootRoute),
  confirmResetPasswordRoute(rootRoute),
  weightRoute(rootRoute),
  weightChartRoute(rootRoute),
  weightGoalRoute(rootRoute),
  verifyEmailRoute(rootRoute),
  profileRoute(rootRoute),
]);

// 3. Create the router
export const router = createRouter({ routeTree });

// 4. ONLY NOW register it for global type safety
//    This must come after router is created
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}