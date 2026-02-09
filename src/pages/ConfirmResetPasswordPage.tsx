// src/pages/ConfirmResetPasswordPage.tsx
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
import { useConfirmResetPasswordPage } from "../hooks/useConfirmResetPasswordPage";
import { router } from "../router/router";
import { Logo } from "../components/Logo";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useSearch } from "@tanstack/react-router";

function ConfirmResetPasswordPage() {
  const search = useSearch({ from: "/confirm-reset-password" });
  const token = search.token ?? "";

  const { form, message, isPending, handleSubmit } =
    useConfirmResetPasswordPage(token);

  if (!token) {
    return (
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
    );
  }

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
              handleSubmit(data, () => router.navigate({ to: "/login" })),
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
              </div>
              {isPending && (
                <div className="flex justify-center py-4">
                  <LoadingSpinner
                    size="md"
                    testId="confirm-reset-password-loading"
                  />
                </div>
              )}
              {message && (
                <p
                  role="alert"
                  data-testid="confirm-reset-password-message"
                  className={cn(
                    "text-sm text-center",
                    message.toLowerCase().includes("failed")
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
                tabIndex={2}
              >
                {isPending ? "Resetting..." : "Reset Password"}
              </Button>
              <div className="mt-4 text-center text-sm">
                <a
                  href="#"
                  role="link"
                  onClick={(e) => {
                    e.preventDefault();
                    router.navigate({ to: "/login" });
                  }}
                  className="underline underline-offset-4"
                  data-testid="back-to-login-link"
                  tabIndex={3}
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

export default ConfirmResetPasswordPage;
