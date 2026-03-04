import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import { useAuthStore } from "@/shared/store/authStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { InstallPWA } from "@/app/components/InstallPWA";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import ProfileHeader from "@/app/components/ProfileHeader";
import CurrentEmailSection from "@/app/components/CurrentEmailSection";
import EmailChangeForm from "@/app/components/EmailChangeForm";
import PasswordResetForm from "@/app/components/PasswordResetForm";
import LogoutSection from "@/app/components/LogoutSection";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = Route.useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();
  const { user, updateUserEmail } = useAuthStore();
  const trpc = useTRPC();

  const currentEmail = user?.email ?? "";
  const hasUser = !!user;

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
              queryKey: trpc.user.getCurrent.queryKey(),
            });
          }
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [currentEmail, updateUserEmail, showBanner, queryClient, trpc]);

  const handleClose = () => {
    try {
      if (router.history.canGoBack()) {
        router.history.back();
        return;
      }
    } catch {
      // treat error as no history → fallback
    }
    navigate({ to: "/lists", replace: true });
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
              <EmailChangeForm currentEmail={currentEmail} hasUser={hasUser} />
              <PasswordResetForm />
              <LogoutSection />
            </div>
          </div>
        </div>

        <InstallPWA />
      </div>
    </div>
  );
}

export default ProfilePage;
