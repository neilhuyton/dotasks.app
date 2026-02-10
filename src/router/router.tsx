// src/router/router.tsx
import { createRouter, createRootRoute } from "@tanstack/react-router";
import Root from "../components/Root";
import { trpcClient } from "../client";
import { queryClient } from "../queryClient"; // adjust path if needed

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

// 1. Root route
const rootRoute = createRootRoute<unknown>({
  component: () => <Root queryClient={queryClient} trpcClient={trpcClient} />,
  errorComponent: (props) => (
    <div>
      An error occurred. Please try again.
      <pre>{JSON.stringify(props.error, null, 2)}</pre>
    </div>
  ),
});

// 2. Build the route tree — call each factory with the correct parent
export const routeTree = rootRoute.addChildren([
  homeRoute(rootRoute),
  registerRoute(rootRoute),
  loginRoute(rootRoute),
  resetPasswordRoute(rootRoute),
  confirmResetPasswordRoute(rootRoute),
  verifyEmailRoute(rootRoute),
  weightRoute(rootRoute),
  weightChartRoute(rootRoute),
  weightGoalRoute(rootRoute),
  profileRoute(rootRoute),
]);

// 3. Create the router
export const router = createRouter({ routeTree });

// 4. Register for type safety — must come after router creation
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}