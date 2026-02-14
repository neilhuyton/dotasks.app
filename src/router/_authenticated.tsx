// src/router/_authenticated.tsx

import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { rootRoute } from "./rootRoute";

export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",

  beforeLoad: ({ location }) => {
    const { isLoggedIn, logout } = useAuthStore.getState();

    if (!isLoggedIn) {
      logout?.();
      throw redirect({
        to: "/login" as const,
        search: { redirect: location.pathname + location.search },
        replace: true,
      });
    }
  },

  component: () => (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  ),
});
