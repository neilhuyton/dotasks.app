// src/routes/register.tsx

import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRegisterPage } from "@/hooks/useRegisterPage";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react"; // ← add this import

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const { form, message, isRegistering, handleRegister } = useRegisterPage();
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
          Create an account
        </h1>

        <p className="text-muted-foreground text-center mb-6">
          Enter your details below to create an account
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleRegister)}
            data-testid="register-form"
            className="w-full"
          >
            <div className="flex flex-col gap-6">
              {/* Email */}
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
                        data-testid="email-input"
                        disabled={isRegistering}
                        tabIndex={1}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="password" data-testid="password-label">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                        data-testid="password-input"
                        disabled={isRegistering}
                        tabIndex={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      htmlFor="confirmPassword"
                      data-testid="confirm-password-label"
                    >
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        required
                        data-testid="confirm-password-input"
                        disabled={isRegistering}
                        tabIndex={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message && (
                <p
                  data-testid="register-message"
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
                data-testid="register-button"
                disabled={isRegistering}
                tabIndex={4}
              >
                {isRegistering && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                )}
                {isRegistering ? "Registering..." : "Register"}
              </Button>

              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <a
                  href="#"
                  role="link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate({ to: "/login" });
                  }}
                  className="underline underline-offset-4"
                  data-testid="login-link"
                  tabIndex={5}
                >
                  Login
                </a>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
