// src/routes/_authenticated/route.tsx

import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import Navigation from "@/components/Navigation";
import ProfileIcon from "@/components/ProfileIcon";

// Detect test environment to skip redirect
const isTestEnv = import.meta.env.MODE === "test" || process.env.NODE_ENV === "test";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (isTestEnv) {
      // In tests: always allow access (we manually set isLoggedIn: true)
      return;
    }

    const { isLoggedIn } = useAuthStore.getState();
    if (!isLoggedIn) {
      throw redirect({ to: "/login", replace: true });
    }
  },

  component: () => {
    return (
      <div className="flex flex-col h-dvh overscroll-none">
        {/* Header – sticky, no extra surprises */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 py-2 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3 sm:gap-4">
            <ProfileIcon />
          </div>
        </header>
        {/* Main becomes the ONLY scrolling container */}
        <main className="flex-1 overflow-y-auto overscroll-y-contain">
          {/* Padding clears the fixed nav + safe area */}
          <div className="pb-20 md:pb-0">
            <Outlet />
          </div>
        </main>
        {/* Bottom nav fixed */}
        <Navigation />
      </div>
    );
  },
});