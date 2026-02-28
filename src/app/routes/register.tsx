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
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "server/trpc";
import { useState } from "react";

const registerSchema = z
  .object({
    email: z
      .string()
      .email({ message: "Please enter a valid email address" })
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(128, { message: "Password is too long" }),
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
  const trpc = useTRPC();

  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const mutation = useMutation(
    trpc.register.mutationOptions({
      onMutate: () => {
        setMessage(null);
      },

      onSuccess: (data) => {
        setMessage(
          data.message ||
            "Registration successful! Please check your email to verify your account.",
        );

        form.reset();

        setTimeout(() => {
          navigate({ to: "/login" });
        }, 1800);
      },

      onError: (err: TRPCClientErrorLike<AppRouter>) => {
        let errorMessage = "Failed to register. Please try again.";

        if (err.message) {
          errorMessage = err.message;
        } else if (err.data?.code === "CONFLICT") {
          errorMessage = "This email is already registered.";
        } else if (err.data?.code === "BAD_REQUEST") {
          errorMessage = "Invalid registration details.";
        }

        setMessage(`Registration failed: ${errorMessage}`);
      },
    }),
  );

  const onSubmit = (values: RegisterFormValues) => {
    mutation.mutate({
      email: values.email,
      password: values.password,
    });
  };

  form.watch(() => {
    if (message) setMessage(null);
  });

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
              {/* Email */}
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
                        disabled={mutation.isPending}
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
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        disabled={mutation.isPending}
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
                    <FormLabel htmlFor="confirmPassword">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        disabled={mutation.isPending}
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
                      message.toLowerCase().includes("match") ||
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
                disabled={mutation.isPending || !form.formState.isValid}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                )}
                {mutation.isPending ? "Registering..." : "Register"}
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
