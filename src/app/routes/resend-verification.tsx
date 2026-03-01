// src/app/routes/resend-verification.tsx

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
import { Mail, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "server/trpc";

const formSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .trim()
    .toLowerCase(),
});

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/resend-verification")({
  component: ResendVerificationPage,
});

function ResendVerificationPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();

  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const mutation = useMutation(
    trpc.verification.resendVerificationEmail.mutationOptions({
      onMutate: () => {
        setMessage(null);
      },

      onSuccess: (data) => {
        setMessage(
          data.message ||
            "A new verification email has been sent. Please check your inbox and spam folder.",
        );
        form.reset();
      },

      onError: (err: TRPCClientErrorLike<AppRouter>) => {
        let msg = "Failed to send verification email. Please try again later.";

        if (err.message?.includes("already verified")) {
          msg = "This email is already verified. You can log in now.";
        } else if (err.message) {
          msg = err.message;
        }

        setMessage(msg);
      },
    }),
  );

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  // Clear message when user changes input
  form.watch(() => {
    if (message) setMessage(null);
  });

  const isError =
    !!message &&
    (message.toLowerCase().includes("failed") ||
      message.toLowerCase().includes("error") ||
      message.toLowerCase().includes("try again"));

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card rounded-xl shadow-sm border p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-center mb-3">
          Resend Verification Email
        </h1>

        <p className="text-muted-foreground text-center mb-8 text-sm">
          If you didn't receive the verification email or it expired,
          <br />
          enter your email below and we'll send a new one.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="name@example.com"
                        className="pl-9"
                        disabled={mutation.isPending}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {message && (
              <div
                className={cn(
                  "text-sm text-center p-3 rounded-md border",
                  isError
                    ? "text-destructive bg-destructive/10 border-destructive/30"
                    : "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
                )}
              >
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || !form.formState.isValid}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mutation.isPending ? "Sending..." : "Resend Verification Email"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => navigate({ to: "/login" })}
          >
            Back to login
          </button>
          {" • "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => navigate({ to: "/register" })}
          >
            Create new account
          </button>
        </div>
      </div>
    </div>
  );
}
