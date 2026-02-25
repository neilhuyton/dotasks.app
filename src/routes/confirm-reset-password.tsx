// src/routes/confirm-reset-password.tsx

import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useConfirmResetPasswordPage } from "@/hooks/useConfirmResetPasswordPage";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const Route = createFileRoute("/confirm-reset-password")({
  validateSearch: searchSchema,

  errorComponent: () => (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <Logo />
      <div className="w-full max-w-md bg-background rounded-lg p-6 text-center mt-8">
        <h1 className="text-2xl font-bold mb-4">Invalid or missing token</h1>
        <p className="text-muted-foreground mb-6">
          Please request a new password reset link.
        </p>
        <Button asChild>
          <a href="/reset-password">Reset Password</a>
        </Button>
      </div>
    </div>
  ),

  component: ConfirmResetPassword,
});

function ConfirmResetPassword() {
  const { token } = Route.useSearch();
  const navigate = Route.useNavigate();

  const { form, message, isPending, handleSubmit } =
    useConfirmResetPasswordPage(token);

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <div className="pt-14">
        <Logo />
      </div>

      <div className="w-full max-w-md bg-background rounded-lg p-4 flex flex-col items-center mt-16 sm:mt-20">
        <h1
          className="text-2xl font-bold text-center mb-4"
          role="heading"
          aria-level={1}
        >
          Reset your password
        </h1>

        <p className="text-muted-foreground text-center mb-6">
          Enter your new password below
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) =>
              handleSubmit(data, () => navigate({ to: "/login" })),
            )}
            role="form"
            data-testid="confirm-reset-password-form"
            className="w-full"
          >
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="newPassword" data-testid="password-label">
                        New Password
                      </Label>
                      <FormControl>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Enter your new password"
                          required
                          data-testid="password-input"
                          disabled={isPending}
                          tabIndex={1}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage data-testid="password-error" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label
                        htmlFor="confirmPassword"
                        data-testid="confirm-password-label"
                      >
                        Confirm New Password
                      </Label>
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your new password"
                          required
                          data-testid="confirm-password-input"
                          disabled={isPending}
                          tabIndex={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage data-testid="confirm-password-error" />
                    </FormItem>
                  )}
                />
              </div>

              {message && (
                <p
                  role="alert"
                  data-testid="confirm-reset-password-message"
                  className={cn(
                    "text-sm text-center",
                    message.toLowerCase().includes("failed") ||
                      message.toLowerCase().includes("match")
                      ? "text-red-500"
                      : "text-green-500",
                  )}
                >
                  {message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full mt-4"
                data-testid="reset-password-button"
                disabled={isPending}
                tabIndex={3}
              >
                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isPending ? "Resetting..." : "Reset Password"}
              </Button>

              <div className="mt-4 text-center text-sm">
                <a
                  href="#"
                  role="link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate({ to: "/login" });
                  }}
                  className="underline underline-offset-4"
                  data-testid="back-to-login-link"
                  tabIndex={4}
                >
                  Back to login
                </a>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
