// src/routes/login.tsx

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
import { Loader2 } from "lucide-react";
import { useLoginPage } from "@/hooks/useLoginPage";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const { form, message, isPending, handleSubmit } = useLoginPage();
  const router = useRouter();

  // Only show message if it's an error (contains "failed" or "error")
  const isErrorMessage =
    message &&
    (message.toLowerCase().includes("failed") ||
      message.toLowerCase().includes("error"));

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <div className="w-full max-w-md bg-background rounded-lg p-4 flex flex-col items-center mt-16 sm:mt-20">
        <h1
          className="text-2xl font-bold text-center mb-4"
          role="heading"
          aria-level={1}
        >
          Login to your account
        </h1>
        <p className="text-muted-foreground text-center mb-6">
          Enter your email below to login to your account
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            data-testid="login-form"
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
                        data-testid="email-input"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between leading-none mb-0">
                      <FormLabel
                        htmlFor="password"
                        data-testid="password-label"
                      >
                        Password
                      </FormLabel>
                      <a
                        href="#"
                        className="inline-block text-sm underline-offset-0 hover:underline"
                        data-testid="forgot-password-link"
                        onClick={(e) => {
                          e.preventDefault();
                          router.navigate({ to: "/reset-password" });
                        }}
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        data-testid="password-input"
                        disabled={isPending}
                        className="w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isErrorMessage && (
                <p
                  data-testid="login-message"
                  className={cn("text-sm text-center text-red-500")}
                >
                  {message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full mt-4"
                data-testid="login-button"
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isPending ? "Logging in..." : "Login"}
              </Button>

              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <a
                  href="#"
                  role="link"
                  className="underline underline-offset-4"
                  data-testid="signup-link"
                  onClick={(e) => {
                    e.preventDefault();
                    router.navigate({ to: "/register" });
                  }}
                >
                  Sign up
                </a>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
