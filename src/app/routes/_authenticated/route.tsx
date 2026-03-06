// src/app/routes/_authenticated/route.tsx

import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/shared/store/authStore";
import ProfileIcon from "@/app/components/ProfileIcon";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { ColorThemeSelector } from "@/app/components/ColorThemeSelector";
import { ActionBanner } from "@/app/components/ActionBanner";
import { GlobalFetchingIndicator } from "@/app/components/GlobalIsFetchingIndicator";
import { useEffect } from "react";
import { Suspense } from "react";

const AuthenticatedLayout = () => {
  const { initialize, loading, user } = useAuthStore();

  useEffect(() => {
    if (!user && !loading) {
      initialize();
    }
  }, [initialize, user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading session...
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading...
        </div>
      }
    >
      <div className="flex flex-col min-h-dvh overscroll-none bg-background">
        <header className="fixed top-0 left-0 right-0 z-30 bg-background px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between border-b">
          <div className="text-xl font-semibold tracking-tight flex items-center gap-2.5">
            Do Tasks
            <GlobalFetchingIndicator />
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <ColorThemeSelector />
            <ProfileIcon />
          </div>
        </header>

        <main
          className="
            flex-1
            pt-[68px] md:pt-[72px]
            pb-[80px] md:pb-[80px]
            overscroll-y-contain
          "
        >
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
            <Outlet />
            <ActionBanner />
          </div>
        </main>
      </div>
    </Suspense>
  );
};

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    const { user, loading } = useAuthStore.getState();

    if (loading) return;

    if (!user) {
      throw redirect({
        to: "/login",
        replace: true,
        search: { redirect: location.href },
      });
    }
  },

  component: AuthenticatedLayout,
});
