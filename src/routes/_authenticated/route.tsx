// src/routes/_authenticated/route.tsx

import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import Navigation from "@/components/Navigation";
import ProfileIcon from "@/components/ProfileIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ColorThemeToggle } from "@/components/ColorThemeToggle";

const isTestEnv =
  import.meta.env.MODE === "test" || process.env.NODE_ENV === "test";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (isTestEnv) return;

    const { isLoggedIn } = useAuthStore.getState();
    if (!isLoggedIn) {
      throw redirect({ to: "/login", replace: true });
    }
  },

  component: () => {
    return (
      <div className="flex flex-col h-dvh overscroll-none bg-background">
        {/* 1. Fixed header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background px-4 py-3 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3 sm:gap-4">
            To Do
            <ThemeToggle />
            <ColorThemeToggle />
            <ProfileIcon />
          </div>
        </header>

        {/* 2. Scrollable content – takes ALL remaining space between header & nav */}
        <main
          className="
            flex-1 overflow-y-auto overscroll-y-contain 
            pt-[68px] md:pt-[72px]           /* header height + a bit of breathing room */
            pb-[76px] md:pb-[72px]           /* bottom nav height + breathing room */
            px-4 sm:px-6 lg:px-8
          "
        >
          <Outlet />
        </main>

        {/* 3. Fixed bottom nav – stays at bottom, no content under it */}
        <Navigation />
      </div>
    );
  },
});
