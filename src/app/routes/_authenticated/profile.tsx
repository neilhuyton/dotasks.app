// src/app/routes/_authenticated/profile.tsx

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc, useTRPC } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import { useAuthStore } from "@/shared/store/authStore";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Loader2, ArrowLeft, Mail, Lock, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const emailChangeSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

const resetRequestSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

type EmailChangeData = z.infer<typeof emailChangeSchema>;
type ResetRequestData = z.infer<typeof resetRequestSchema>;

export const Route = createFileRoute("/_authenticated/profile")({
  loader: async ({ context: { queryClient } }) => {
    const { accessToken } = useAuthStore.getState();

    if (!accessToken) {
      return {};
    }

    await queryClient.ensureQueryData(trpc.user.getCurrent.queryOptions());

    return {};
  },

  component: ProfilePage,
});

function ProfilePage() {
  const navigate = Route.useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();
  const { logout } = useAuthStore();

  const trpc = useTRPC();

  const userQueryKey = trpc.user.getCurrent.queryKey();

  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery(
    trpc.user.getCurrent.queryOptions(undefined, {
      staleTime: 5 * 60 * 1000,
    }),
  );

  const currentEmail = user?.email ?? "";

  const updateEmailMutation = useMutation(
    trpc.user.updateEmail.mutationOptions({
      onMutate: async (input: { email: string }) => {
        await queryClient.cancelQueries({ queryKey: userQueryKey });
        const prevUser = queryClient.getQueryData(userQueryKey);

        queryClient.setQueryData(userQueryKey, (old: typeof user) =>
          old ? { ...old, email: input.email } : old,
        );

        return { prevUser };
      },

      onError: (_, __, ctx) => {
        if (ctx?.prevUser) queryClient.setQueryData(userQueryKey, ctx.prevUser);
        showBanner({
          message: "Failed to update email. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: userQueryKey });
      },

      onSuccess: (result) => {
        showBanner({
          message: result.message || "Email updated successfully.",
          variant: "success",
          duration: 3000,
        });
        emailForm.reset();
      },
    }),
  );

  const requestResetMutation = useMutation(
    trpc.resetPassword.request.mutationOptions({
      onSuccess: (result) => {
        showBanner({
          message: result.message,
          variant: "success",
          duration: 5000,
        });
        resetForm.reset();
      },

      onError: () => {
        showBanner({
          message: "Failed to send reset link. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },
    }),
  );

  const emailForm = useForm<EmailChangeData>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const resetForm = useForm<ResetRequestData>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const handleEmailSubmit = (data: EmailChangeData) => {
    updateEmailMutation.mutate({ email: data.email });
  };

  const handleResetSubmit = (data: ResetRequestData) => {
    requestResetMutation.mutate({ email: data.email });
  };

  const handleLogoutConfirm = () => {
    logout();
    navigate({ to: "/login", replace: true });
    showBanner({
      message: "Logged out successfully.",
      variant: "success",
      duration: 3000,
    });
  };

  const handleClose = () => {
    try {
      if (router.history.canGoBack()) {
        router.history.back();
        return;
      }
    } catch {
      // Silently ignore any error from canGoBack() and fall back
    }

    navigate({ to: "/lists", replace: true });
  };

  const isAnyPending =
    updateEmailMutation.isPending || requestResetMutation.isPending;

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
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
          aria-label="Close profile"
          onClick={handleClose}
          disabled={isAnyPending}
          data-testid="close-profile"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight"
                data-testid="profile-heading"
              >
                Profile
              </h1>
            </div>

            <div className="space-y-6">
              {/* Current Email */}
              <div className="space-y-3">
                <Label className="text-sm font-medium block">
                  Current Email
                </Label>
                {isUserLoading ? (
                  <div
                    className="h-10 bg-muted animate-pulse rounded-md"
                    data-testid="email-skeleton"
                  />
                ) : isUserError || !user ? (
                  <div className="text-destructive text-sm">
                    Failed to load profile
                  </div>
                ) : (
                  <div
                    className="p-2 bg-muted/50 rounded-lg border text-base font-medium break-all"
                    data-testid="current-email"
                  >
                    {currentEmail}
                  </div>
                )}
              </div>

              {/* Change Email */}
              <form
                onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                className="space-y-2"
                data-testid="email-form"
              >
                <div className="space-y-3">
                  <Label
                    htmlFor="new-email"
                    className="text-sm font-medium block"
                  >
                    New Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="your.new@email.com"
                      className="pl-10"
                      disabled={isAnyPending}
                      {...emailForm.register("email")}
                      data-testid="email-input"
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isAnyPending || !emailForm.formState.isDirty}
                    className="w-full sm:w-auto px-6"
                    data-testid="email-submit"
                  >
                    {updateEmailMutation.isPending && (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    )}
                    {updateEmailMutation.isPending
                      ? "Updating..."
                      : "Update Email"}
                  </Button>
                </div>
              </form>

              {/* Send Password Reset Link */}
              <form
                onSubmit={resetForm.handleSubmit(handleResetSubmit)}
                className="space-y-2 pt-8 border-t"
                data-testid="password-form"
              >
                <div className="space-y-3">
                  <Label
                    htmlFor="reset-email"
                    className="text-sm font-medium block"
                  >
                    Email for Reset Link
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      disabled={isAnyPending}
                      {...resetForm.register("email")}
                      data-testid="password-input"
                    />
                  </div>
                  {resetForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {resetForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isAnyPending || !resetForm.formState.isDirty}
                    className="w-full sm:w-auto px-6"
                    data-testid="reset-submit"
                  >
                    {requestResetMutation.isPending && (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    )}
                    {requestResetMutation.isPending
                      ? "Sending..."
                      : "Send Reset Link"}
                  </Button>
                </div>
              </form>

              {/* Logout */}
              <div className="pt-12 border-t flex justify-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full sm:w-auto px-6 gap-2"
                      disabled={isAnyPending}
                      data-testid="logout-button"
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure you want to log out?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        You will be signed out of your account. Any unsaved
                        changes may be lost.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLogoutConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Logout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
