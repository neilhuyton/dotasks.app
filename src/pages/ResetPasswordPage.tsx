// src/components/ResetPasswordPage.tsx

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
import { useResetPasswordPage } from "../hooks/useResetPasswordPage";
import { router } from "../router/router";
import { Logo } from "../components/Logo";
import { LoadingSpinner } from "../components/LoadingSpinner";

interface ResetPasswordFormProps {
  className?: string;
}

function ResetPasswordPage({ className }: ResetPasswordFormProps) {
  const { form, message, isPending, handleSubmit } = useResetPasswordPage();

  return (
    <div
      className={cn(
        "min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3",
        className,
      )}
    >
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
          Enter your email to receive a password reset link
        </p>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              form.handleSubmit(handleSubmit)(e);
            }}
            role="form"
            data-testid="reset-password-form"
            className="w-full"
          >
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="email" data-testid="email-label">
                        Email
                      </Label>
                      <FormControl>
                        <Input
                          id="email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          disabled={isPending}
                          data-testid="email-input"
                          tabIndex={1}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {isPending && (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="md" testId="reset-password-loading" />
                </div>
              )}
              {message && (
                <p
                  role="alert"
                  className={cn(
                    "text-sm text-center",
                    message.includes("failed")
                      ? "text-red-500"
                      : "text-green-500",
                  )}
                  data-testid="reset-password-message"
                >
                  {message}
                </p>
              )}
              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isPending}
                data-testid="submit-button"
                tabIndex={2}
              >
                {isPending ? "Sending..." : "Send Reset Link"}
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

export default ResetPasswordPage;
