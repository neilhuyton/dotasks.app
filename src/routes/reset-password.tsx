// src/routes/reset-password.tsx

import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel, // ← changed from Label to FormLabel for consistency
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useResetPasswordPage } from "@/hooks/useResetPasswordPage";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react"; // ← added

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const { form, message, isPending, handleSubmit } = useResetPasswordPage();

  const navigate = Route.useNavigate();

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
          Enter your email to receive a password reset link
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            role="form"
            data-testid="reset-password-form"
            className="w-full"
          >
            <div className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email" data-testid="email-label">
                      Email
                    </FormLabel>
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

              {message && (
                <p
                  role="alert"
                  className={cn(
                    "text-sm text-center",
                    /failed|error/i.test(message)
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
                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isPending ? "Sending..." : "Send Reset Link"}
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
