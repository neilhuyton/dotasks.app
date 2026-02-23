// src/routes/_authenticated/route.tsx

import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
// import Navigation from "@/components/Navigation";
import ProfileIcon from "@/components/ProfileIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ColorThemeToggle } from "@/components/ColorThemeToggle";
import { ActionBanner } from "@/components/ActionBanner";

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
      <div className="flex flex-col min-h-dvh overscroll-none bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between border-b">
          <div className="text-xl font-semibold tracking-tight">Do Tasks</div>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <ColorThemeToggle />
            <ProfileIcon />
          </div>
        </header>

        <main
          className="
            flex-1
            pt-[68px] md:pt-[72px]
            pb-[80px] md:pb-[80px]          /* slightly increased to safely accommodate FAB */
            overscroll-y-contain
          "
        >
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
            <Outlet />
            <ActionBanner />
          </div>
        </main>

        {/* Bottom navigation – full width, no extra side padding */}
        {/* <Navigation /> */}
      </div>
    );
  },
});