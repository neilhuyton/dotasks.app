// src/app/routes/confirm-reset-password.tsx

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
import { useState, useEffect } from "react";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "server/trpc";

const searchSchema = z.object({
  token: z.string().optional(),
});

const formSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/confirm-reset-password")({
  validateSearch: searchSchema,

  component: ConfirmResetPasswordPage,
});

function ConfirmResetPasswordPage() {
  const search = Route.useSearch();
  const token = search.token?.trim() || "";

  const navigate = Route.useNavigate();
  const trpc = useTRPC();

  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch(() => {
      if (message) setMessage(null);
    });
    return () => subscription.unsubscribe();
  }, [form, message]);

  const mutation = useMutation(
    trpc.resetPassword.confirm.mutationOptions({
      onMutate: () => {
        setMessage(null);
      },

      onSuccess: () => {
        setMessage("Password reset successfully! Redirecting to login...");

        const timeout = setTimeout(() => {
          form.reset();
          setMessage(null);
          navigate({ to: "/login" });
        }, 3000);

        return () => clearTimeout(timeout);
      },

      onError: (err: TRPCClientErrorLike<AppRouter>) => {
        let errorMessage = "Failed to reset password. Please try again.";

        if (err.message) {
          errorMessage = err.message;
        } else if (
          err.data?.code === "NOT_FOUND" ||
          err.data?.code === "UNAUTHORIZED"
        ) {
          errorMessage =
            "Invalid or expired reset token. Please request a new one.";
        } else if (err.data?.code === "BAD_REQUEST") {
          errorMessage = "Invalid password format.";
        }

        setMessage(errorMessage);
      },
    }),
  );

  const onSubmit = (values: FormValues) => {
    if (!token) {
      setMessage(
        "Reset token is missing or invalid. Please use the link from your email.",
      );
      return;
    }

    mutation.mutate({
      token,
      newPassword: values.newPassword,
    });
  };

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
            onSubmit={form.handleSubmit(onSubmit)}
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
                      <FormLabel htmlFor="newPassword">New Password</FormLabel>
                      <FormControl>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Enter your new password"
                          disabled={mutation.isPending}
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
                        Confirm New Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your new password"
                          disabled={mutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
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
                    message.toLowerCase().includes("success")
                      ? "text-green-500"
                      : "text-red-500",
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
                {mutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>

              <div className="mt-4 text-center text-sm">
                <button
                  type="button"
                  className="underline underline-offset-4 text-primary hover:text-primary/80"
                  onClick={() => navigate({ to: "/login" })}
                >
                  Back to login
                </button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
