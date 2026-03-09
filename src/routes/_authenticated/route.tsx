// src/app/routes/_authenticated/route.tsx

import {
  createFileRoute,
  redirect,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { Suspense } from "react";
import {
  ActionBanner,
  ColorThemeSelector,
  ProfileIcon,
  ThemeToggle,
  // GlobalFetchingIndicator,
} from "@steel-cut/steel-lib";

const AuthenticatedLayout = () => {
  const navigate = useNavigate();
  const { initialize, loading, user } = useAuthStore();

  useEffect(() => {
    if (!user && !loading) {
      initialize();
    }
  }, [initialize, user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground animate-pulse">
          Loading session...
        </p>
      </div>
    );
  }

  const handleProfileClick = () => {
    navigate({ to: "/profile" });
  };

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          Loading...
        </div>
      }
    >
      <div className="flex flex-col min-h-dvh overscroll-none bg-background">
        <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="text-xl font-semibold tracking-tight flex items-center gap-2.5">
            Do Tasks
            {/* {!loading && <GlobalFetchingIndicator />} */}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <ColorThemeSelector />
            <ProfileIcon onClick={handleProfileClick} />
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
        search: { redirect: location.href || "/lists" },
      });
    }
  },

  component: AuthenticatedLayout,
});
