import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mail, Lock, LogOut, ArrowLeft } from "lucide-react";
import { VisuallyHidden } from "radix-ui"; // assuming you're using @radix-ui/react-visually-hidden

import { useProfilePage } from "@/hooks/useProfilePage";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  const {
    emailForm,
    passwordForm,
    emailMessage,
    passwordMessage,
    isEmailPending,
    isPasswordPending,
    handleEmailSubmit,
    handlePasswordSubmit,
    handleLogout,
    currentEmail,
    isUserLoading,
  } = useProfilePage();

  const navigate = Route.useNavigate();
  const router = useRouter();

  const handleClose = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "/", replace: true });
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        "h-[100dvh] w-[100dvw] max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 translate-x-0 translate-y-0",
        "bg-background overscroll-none",
      )}
      data-testid="profile-page-content"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="relative px-4 sm:px-6 pt-14 pb-5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
            aria-label="Close profile"
            onClick={handleClose}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              User Profile
            </h1>
            <VisuallyHidden.Root>
              Manage your account settings, email, and password.
            </VisuallyHidden.Root>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-12">
          <div className="mx-auto max-w-3xl space-y-8 sm:space-y-10 lg:space-y-12">
            {/* Current Email */}
            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-lg sm:text-xl font-semibold text-center sm:text-left">
                Account Information
              </h2>
              <div className="bg-muted/40 p-3 sm:p-4 rounded-lg border">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Current Email
                </label>
                {isUserLoading ? (
                  <div
                    className="h-5 sm:h-6 bg-muted animate-pulse rounded w-56 sm:w-64"
                    data-testid="email-skeleton"
                  />
                ) : currentEmail ? (
                  <p
                    className="text-base font-medium break-all"
                    data-testid="current-email"
                  >
                    {currentEmail}
                  </p>
                ) : (
                  <p className="text-sm sm:text-base text-muted-foreground italic">
                    Not available
                  </p>
                )}
              </div>
            </div>

            {/* Change Email Form */}
            <form
              onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
              className="space-y-4 sm:space-y-5"
              data-testid="email-form"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-center sm:text-left">
                Change Email
              </h2>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0 opacity-70" />
                  <input
                    type="email"
                    placeholder="New email address"
                    {...emailForm.register("email")}
                    className="flex-1 p-2.5 sm:p-3 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base"
                    data-testid="email-input"
                  />
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="min-w-[140px] sm:min-w-[180px] text-sm sm:text-base px-6 py-5 sm:py-5"
                  disabled={isEmailPending}
                  data-testid="email-submit"
                >
                  {isEmailPending ? "Updating..." : "Update Email"}
                </Button>
              </div>

              {emailForm.formState.errors.email && (
                <p
                  className="text-red-500 text-xs sm:text-sm text-center sm:text-left"
                  data-testid="email-validation-error"
                >
                  {emailForm.formState.errors.email.message}
                </p>
              )}

              {emailMessage && (
                <p
                  className={cn(
                    "text-xs sm:text-sm text-center sm:text-left",
                    emailMessage.toLowerCase().includes("success") ||
                      emailMessage.toLowerCase().includes("updated")
                      ? "text-green-500"
                      : "text-red-500",
                  )}
                  data-testid={
                    emailMessage.toLowerCase().includes("success") ||
                    emailMessage.toLowerCase().includes("updated")
                      ? "email-success"
                      : "email-error"
                  }
                >
                  {emailMessage}
                </p>
              )}
            </form>

            {/* Change Password Form */}
            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              className="space-y-4 sm:space-y-5"
              data-testid="password-form"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-center sm:text-left">
                Change Password
              </h2>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1">
                  <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                  <input
                    type="email" // ← note: most likely should be type="email" but consider changing logic to password reset
                    placeholder="Enter your email"
                    {...passwordForm.register("email")}
                    className="flex-1 p-2.5 sm:p-3 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base"
                    data-testid="password-input"
                  />
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="min-w-[140px] sm:min-w-[180px] text-sm sm:text-base px-6 py-5 sm:py-5"
                  disabled={isPasswordPending}
                  data-testid="password-submit"
                >
                  {isPasswordPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>

              {passwordMessage && (
                <p
                  className={cn(
                    "text-xs sm:text-sm text-center sm:text-left",
                    passwordMessage.toLowerCase().includes("success") ||
                      passwordMessage.toLowerCase().includes("sent")
                      ? "text-green-500"
                      : "text-red-500",
                  )}
                  data-testid={
                    passwordMessage.toLowerCase().includes("success") ||
                    passwordMessage.toLowerCase().includes("sent")
                      ? "password-success"
                      : "password-error"
                  }
                >
                  {passwordMessage}
                </p>
              )}
            </form>

            {/* Logout */}
            <div className="pt-6 sm:pt-8 border-t">
              <div className="flex justify-center">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="min-w-[180px] sm:min-w-[220px] text-sm sm:text-base px-8 py-5 flex items-center justify-center gap-2"
                  data-testid="logout-button"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
