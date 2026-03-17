import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  InstallPWA,
  LogoutSection,
  useBannerStore,
} from "@steel-cut/steel-lib";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  ProfileHeader,
  CurrentEmailSection,
  EmailChangeForm,
  PasswordResetForm,
} from "@steel-cut/steel-lib";
import { APP_CONFIG } from "@/appConfig";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = Route.useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();
  const { user, updateUserEmail, signOut } = useAuthStore();

  const currentEmail = user?.email ?? "";
  const hasUser = !!user;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "USER_UPDATED" && session?.user?.email) {
          const newEmail = session.user.email;
          if (newEmail !== currentEmail) {
            updateUserEmail(newEmail);
            showBanner({
              message: `Your email has been updated to ${newEmail}`,
              variant: "success",
              duration: 5000,
            });
            queryClient.invalidateQueries({
              queryKey: [["user", "getCurrent"]],
            });
          }
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [currentEmail, updateUserEmail, showBanner, queryClient]);

  const handleClose = () => {
    try {
      if (router.history.canGoBack()) {
        router.history.back();
        return;
      }
    } catch {
      // empty
    }
    navigate({ to: APP_CONFIG.defaultAuthenticatedPath, replace: true });
  };

  const handleEmailChange = async (newEmail: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut().catch((err) =>
      console.warn("[Logout] supabase.auth.signOut failed (non-blocking)", err),
    );

    const ref = new URL(import.meta.env.VITE_SUPABASE_URL!).hostname.split(
      ".",
    )[0];
    localStorage.removeItem(`sb-${ref}-auth-token`);

    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.includes("-auth"))
      .forEach((key) => localStorage.removeItem(key));

    queryClient.clear();

    window.location.replace("/login");
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[30] isolate pointer-events-auto",
        "h-dvh w-dvw max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0",
        "rounded-none border-0 shadow-none",
        "bg-background overscroll-none touch-none",
      )}
    >
      <div className="relative flex min-h-full flex-col overflow-y-auto px-6 pb-20 pt-20 sm:px-8">
        <button
          type="button"
          onClick={handleClose}
          className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
          aria-label="Close profile"
          data-testid="close-profile"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <ProfileHeader />

            <div className="space-y-10">
              <CurrentEmailSection
                currentEmail={currentEmail}
                hasUser={hasUser}
              />
              <EmailChangeForm
                currentEmail={currentEmail}
                isDisabled={!hasUser}
                isLoading={isLoading}
                onSubmit={handleEmailChange}
              />
              <PasswordResetForm
                email={currentEmail}
                onSubmit={async (email) => {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    email,
                    {
                      redirectTo: `${window.location.origin}/update-password`,
                    },
                  );
                  if (error) throw error;
                }}
              />
              <LogoutSection onLogout={handleLogout} />
            </div>
          </div>
        </div>

        <InstallPWA />
      </div>
    </div>
  );
}
