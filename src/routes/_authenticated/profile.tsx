// src/routes/_authenticated/profile.tsx

import { createFileRoute } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Mail, Lock, LogOut } from "lucide-react";
import { VisuallyHidden } from "radix-ui";

import { useProfilePage } from "@/hooks/useProfilePage";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileModalRoute,
});

function ProfileModalRoute() {
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

  const isTestEnv =
    import.meta.env.MODE === "test" || process.env.NODE_ENV === "test";

  const handleClose = () => {
    navigate({ to: "/lists", replace: true });
  };

  return (
    <Dialog
      open={true}
      onOpenChange={
        isTestEnv
          ? undefined
          : (open) => {
              if (!open) handleClose();
            }
      }
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-0 z-50",
          "h-[100dvh] w-[100dvw] max-h-none max-w-none",
          "m-0 p-0 left-0 top-0 translate-x-0 translate-y-0",
          "rounded-none border-0 shadow-none",
          "bg-background",
          "overscroll-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "sm:max-w-none md:max-w-none lg:max-w-none",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="relative px-4 sm:px-6 pt-16 pb-6 shrink-0">
            <DialogClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-6 sm:left-6 sm:top-8 z-10"
                aria-label="Close profile"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>

            <div className="mx-auto max-w-3xl text-center">
              <DialogTitle className="text-3xl font-bold tracking-tight">
                User Profile
              </DialogTitle>
              <VisuallyHidden.Root>
                <DialogDescription>
                  Manage your account settings, email, and password.
                </DialogDescription>
              </VisuallyHidden.Root>
            </div>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-12">
              {/* Current Email */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-center sm:text-left">
                  Account Information
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/40 p-5 rounded-lg border">
                  <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1 sm:mt-0" />
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-muted-foreground">
                      Current Email
                    </label>
                    {isUserLoading ? (
                      <div
                        className="h-6 bg-muted animate-pulse rounded w-64 mt-1"
                        data-testid="email-skeleton"
                      />
                    ) : currentEmail ? (
                      <p
                        className="text-base font-medium mt-1 break-all"
                        data-testid="current-email"
                      >
                        {currentEmail}
                      </p>
                    ) : (
                      <p className="text-base text-muted-foreground mt-1 italic">
                        Not available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Change Email Form */}
              <form
                onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                className="space-y-5"
                data-testid="email-form"
              >
                <h2 className="text-xl font-semibold text-center sm:text-left">
                  Change Email
                </h2>
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-primary flex-shrink-0 opacity-70" />
                  <input
                    type="email"
                    placeholder="New email address"
                    {...emailForm.register("email")}
                    className="flex-1 p-3 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    data-testid="email-input"
                  />
                </div>

                {emailForm.formState.errors.email && (
                  <p
                    className="text-red-500 text-sm text-center sm:text-left"
                    data-testid="email-validation-error"
                  >
                    {emailForm.formState.errors.email.message}
                  </p>
                )}

                {emailMessage && (
                  <p
                    className={cn(
                      "text-sm text-center sm:text-left",
                      emailMessage.includes("fail") ||
                        emailMessage.includes("error")
                        ? "text-red-500"
                        : "text-green-500",
                    )}
                    data-testid={
                      emailMessage.includes("fail") ||
                      emailMessage.includes("error")
                        ? "email-error"
                        : "email-success"
                    }
                  >
                    {emailMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isEmailPending}
                  data-testid="email-submit"
                >
                  {isEmailPending ? "Updating..." : "Update Email"}
                </Button>
              </form>

              {/* Password Reset Form */}
              <form
                onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                className="space-y-5"
                data-testid="password-form"
              >
                <h2 className="text-xl font-semibold text-center sm:text-left">
                  Change Password
                </h2>
                <div className="flex items-center gap-3">
                  <Lock className="h-6 w-6 text-primary flex-shrink-0" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    {...passwordForm.register("email")}
                    className="flex-1 p-3 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    data-testid="password-input"
                  />
                </div>

                {passwordMessage && (
                  <p
                    className={cn(
                      "text-sm text-center sm:text-left",
                      passwordMessage.includes("fail") ||
                        passwordMessage.includes("error")
                        ? "text-red-500"
                        : "text-green-500",
                    )}
                    data-testid={
                      passwordMessage.includes("fail") ||
                      passwordMessage.includes("error")
                        ? "password-error"
                        : "password-success"
                    }
                  >
                    {passwordMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPasswordPending}
                  data-testid="password-submit"
                >
                  {isPasswordPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>

              {/* Logout */}
              <div className="pt-8 border-t">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2"
                  data-testid="logout-button"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
