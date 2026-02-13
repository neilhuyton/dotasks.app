// src/pages/ProfilePage.tsx

import { useNavigate } from "@tanstack/react-router";
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
import { useProfilePage } from "@/hooks/useProfilePage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Link } from "@tanstack/react-router";
import { VisuallyHidden } from "radix-ui";

export default function ProfilePage() {
  const navigate = useNavigate();

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
  } = useProfilePage();

  // Close dialog → navigate back to weight tracker
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate({ to: "/weight", replace: false });
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false} // we use custom close
        className={cn(
          "fixed inset-0 z-50",
          "h-[100dvh] w-[100dvw] max-h-none max-w-none",
          "m-0 p-0 left-0 top-0 translate-x-0 translate-y-0",
          "rounded-none border-0 shadow-none",
          "bg-background",
          "overscroll-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "sm:max-w-none md:max-w-none lg:max-w-none"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="relative px-4 sm:px-6 pt-16 pb-6 shrink-0">
            {/* Custom close button – using DialogClose to avoid nesting issues */}
            <DialogClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-6 sm:left-6 sm:top-8 z-10"
                aria-label="Close profile"
              >
                <X className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DialogClose>

            <div className="mx-auto max-w-3xl">
              <DialogTitle className="text-3xl font-bold tracking-tight text-center">
                User Profile
              </DialogTitle>

              {/* Hidden description for accessibility – matches your WeightHistoryDialog pattern */}
              <VisuallyHidden.Root>
                <DialogDescription className="mt-2 text-center text-muted-foreground">
                  Manage your account settings, email, and password.
                </DialogDescription>
              </VisuallyHidden.Root>
            </div>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-12">

              {/* Change Email */}
              <form
                onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                className="space-y-5"
                data-testid="email-form"
              >
                <h2 className="text-xl font-semibold text-center sm:text-left">
                  Change Email
                </h2>

                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-primary flex-shrink-0" />
                  <input
                    type="email"
                    placeholder="New email address"
                    {...emailForm.register("email")}
                    className="flex-1 p-3 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    aria-label="New email address"
                    data-testid="email-input"
                  />
                </div>

                {emailForm.formState.errors.email && (
                  <p className="text-red-500 text-sm text-center sm:text-left" data-testid="email-error">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}

                {isEmailPending && (
                  <div className="flex justify-center py-3">
                    <LoadingSpinner size="md" testId="email-loading" />
                  </div>
                )}

                {emailMessage && (
                  <p
                    className={cn(
                      "text-sm text-center sm:text-left",
                      emailMessage.toLowerCase().includes("fail") || emailMessage.toLowerCase().includes("error")
                        ? "text-red-500"
                        : "text-green-500"
                    )}
                    data-testid={
                      emailMessage.toLowerCase().includes("fail") || emailMessage.toLowerCase().includes("error")
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

              {/* Change Password (send reset link) */}
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
                    placeholder="Enter your current email"
                    {...passwordForm.register("email")}
                    className="flex-1 p-3 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    aria-label="Email for password reset"
                    data-testid="password-input"
                  />
                </div>

                {passwordForm.formState.errors.email && (
                  <p className="text-red-500 text-sm text-center sm:text-left" data-testid="password-error">
                    {passwordForm.formState.errors.email.message}
                  </p>
                )}

                {isPasswordPending && (
                  <div className="flex justify-center py-3">
                    <LoadingSpinner size="md" testId="password-loading" />
                  </div>
                )}

                {passwordMessage && (
                  <p
                    className={cn(
                      "text-sm text-center sm:text-left",
                      passwordMessage.toLowerCase().includes("fail") || passwordMessage.toLowerCase().includes("error")
                        ? "text-red-500"
                        : "text-green-500"
                    )}
                    data-testid={
                      passwordMessage.toLowerCase().includes("fail") || passwordMessage.toLowerCase().includes("error")
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

              {/* Bottom actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleLogout(); // hook already navigates to /login
                  }}
                  className="w-full sm:w-auto flex items-center gap-2"
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