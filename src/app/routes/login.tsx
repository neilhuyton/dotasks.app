// src/app/routes/login.tsx

import { createFileRoute, redirect } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/shared/store/authStore";

const formSchema = z.object({
  email: z.email("Please enter a valid email address").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await useAuthStore.getState().waitUntilReady();

    if (session?.user?.id) {
      throw redirect({
        to: "/lists",
        replace: true,
      });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (
      useAuthStore.getState().isInitialized &&
      useAuthStore.getState().session?.user?.id
    ) {
      navigate({ to: "/lists", replace: true });
    }
  }, [navigate]);

  const onSubmit = async (values: FormValues) => {
    setMessage(null);
    setIsPending(true);

    const { error } = await signIn(values.email, values.password);

    if (error) {
      let errorMessage = "Invalid email or password";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage =
          "Please verify your email before logging in. Check your inbox/spam folder.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessage(`Login failed: ${errorMessage}`);
      setIsPending(false);
      return;
    }

    setMessage("Login successful!");
    form.reset();
    navigate({ to: "/lists" });
  };

  form.watch((_, { name }) => {
    if (name === "email" || name === "password") {
      if (message) setMessage(null);
    }
  });

  const isErrorMessage = !!message && message.toLowerCase().includes("failed");

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
            onSubmit={form.handleSubmit(onSubmit)}
            data-testid="login-form"
            className="w-full"
          >
            <div className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
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
                      <FormLabel htmlFor="password">Password</FormLabel>
                      <button
                        type="button"
                        className="inline-block text-sm underline-offset-0 hover:underline text-primary"
                        onClick={() => navigate({ to: "/reset-password" })}
                      >
                        Forgot your password?
                      </button>
                    </div>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isErrorMessage && message && (
                <p
                  data-testid="login-message"
                  className={cn("text-sm text-center text-red-500")}
                >
                  {message}
                </p>
              )}

              <div className="text-center text-sm mt-2">
                Didn't receive verification email or can't log in?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => {
                    const email = form.getValues("email");
                    navigate({
                      to: "/resend-verification",
                      search: email ? { email } : undefined,
                    });
                  }}
                >
                  Resend verification email
                </button>
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isPending || !form.formState.isValid}
              >
                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isPending ? "Logging in..." : "Login"}
              </Button>

              <div className="mt-4 text-center text-sm">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="underline underline-offset-4 text-primary hover:text-primary/80"
                  onClick={() => navigate({ to: "/register" })}
                >
                  Sign up
                </button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
