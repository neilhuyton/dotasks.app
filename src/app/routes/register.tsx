// src/app/routes/register.tsx

import { createFileRoute } from "@tanstack/react-router";
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
import { Logo } from "@/app/components/Logo";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/shared/store/authStore";

const registerSchema = z
  .object({
    email: z.email("Please enter a valid email").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = Route.useNavigate();
  const { signUp } = useAuthStore();

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch(() => {
      if (message) setMessage(null);
    });
    return () => subscription.unsubscribe();
  }, [form, message]);

  const onSubmit = async (values: RegisterFormValues) => {
    setMessage(null);
    setIsPending(true);

    const { error } = await signUp(values.email, values.password);

    if (error) {
      let errorMsg = "Failed to register. Please try again.";

      if (error.message?.toLowerCase().includes("already registered")) {
        errorMsg = "This email is already registered. Please log in.";
      } else if (error.message?.toLowerCase().includes("weak password")) {
        errorMsg = "Password is too weak. Please choose a stronger password.";
      } else if (error.message) {
        errorMsg = error.message;
      }

      setMessage(`Registration failed: ${errorMsg}`);
      setIsPending(false);
      return;
    }

    setMessage(
      "Account created! Please check your email (including spam/junk) to verify your account.",
    );
    form.reset();
    setIsPending(false);

    setTimeout(() => navigate({ to: "/login" }), 4000);
  };

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
            onSubmit={form.handleSubmit(onSubmit)}
            data-testid="register-form"
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
                    <FormLabel htmlFor="password">Password</FormLabel>
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="confirmPassword">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message && (
                <p
                  className={cn(
                    "text-sm text-center",
                    message.toLowerCase().includes("failed") ||
                      message.toLowerCase().includes("already")
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
                disabled={isPending || !form.formState.isValid}
              >
                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isPending ? "Registering..." : "Register"}
              </Button>

              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  className="underline underline-offset-4 text-primary hover:text-primary/80"
                  onClick={() => navigate({ to: "/login" })}
                >
                  Login
                </button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
