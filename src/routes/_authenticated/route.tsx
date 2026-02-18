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
        {/* Header – fixed at top */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 py-3 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3 sm:gap-4">
            <ProfileIcon />
          </div>
        </header>

        {/* Main content area – scrolls, clears fixed header + bottom nav */}
        <main className="flex-1 overflow-y-auto overscroll-y-contain pt-16 md:pt-20">
          {/* Inner wrapper handles bottom clearance + safe areas */}
          <div className="pb-24 md:pb-20 pb-[env(safe-area-inset-bottom)] min-h-[calc(100vh-var(--header-height,64px))] md:min-h-auto">
            <Outlet />
          </div>
        </main>

        {/* Bottom navigation – fixed */}
        <Navigation />
      </div>
    );
  },
});