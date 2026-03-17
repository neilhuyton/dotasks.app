import {
  createFileRoute,
  redirect,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { ProfileIcon } from "@steel-cut/steel-lib";
import { ThemeToggle } from "@steel-cut/steel-lib";
import { ColorThemeSelector } from "@steel-cut/steel-lib";
import { ActionBanner } from "@steel-cut/steel-lib";
import { useEffect } from "react";
import { Suspense } from "react";
import { APP_CONFIG } from "@/appConfig";

const AuthenticatedLayout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (!user && !loading) {
      navigate({
        to: "/login",
        search: { redirect: window.location.pathname },
      });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading session...
      </div>
    );
  }

  const handleProfileClick = () => {
    navigate({ to: "/profile" });
  };

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
            {APP_CONFIG.appName}
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
  beforeLoad: async ({ location }) => {
    const store = useAuthStore.getState();

    // If store not ready → wait for init
    if (!store.isInitialized) {
      await store.initialize();
    }

    const { user, loading } = useAuthStore.getState();

    // Still loading after init → defer decision to layout
    if (loading) return;

    if (!user) {
      throw redirect({
        to: "/login",
        replace: true,
        search: { redirect: location.href || location.pathname },
      });
    }
  },

  component: AuthenticatedLayout,
});
