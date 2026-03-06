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
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

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

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const onSubmit = async (values: FormValues) => {
    setMessage(null);
    setIsPending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: values.email,
      });

      if (error) {
        let msg =
          "Failed to resend verification email. Please try again later.";

        if (
          error.message?.includes("already confirmed") ||
          error.message?.includes("already verified")
        ) {
          msg = "This email is already verified. You can log in now.";
        } else if (
          error.message?.includes("rate limit") ||
          error.message?.includes("too many requests")
        ) {
          msg = "Too many requests. Please wait a minute and try again.";
        } else if (error.message) {
          msg = error.message;
        }

        setMessage(msg);
      } else {
        setMessage(
          "A new verification email has been sent. Please check your inbox and spam folder.",
        );
        form.reset();
      }
    } catch {
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  // Clear message on input change
  form.watch(() => {
    if (message) setMessage(null);
  });

  const isErrorMessage =
    !!message &&
    (message.toLowerCase().includes("failed") ||
      message.toLowerCase().includes("error") ||
      message.toLowerCase().includes("try again") ||
      message.toLowerCase().includes("too many") ||
      message.toLowerCase().includes("rate limit"));

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <div className="w-full max-w-md bg-background rounded-lg p-4 flex flex-col items-center mt-16 sm:mt-20">
        <h1
          className="text-2xl font-bold text-center mb-4"
          role="heading"
          aria-level={1}
        >
          Resend Verification Email
        </h1>

        <p className="text-muted-foreground text-center mb-6 text-sm">
          If you didn't receive the verification email or it expired, enter your
          email below and we'll send a new one.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full"
            data-testid="resend-verification-form"
          >
            <div className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="email"
                          placeholder="name@example.com"
                          className="pl-9"
                          disabled={isPending}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message && (
                <p
                  data-testid="resend-message"
                  className={cn(
                    "text-sm text-center",
                    isErrorMessage
                      ? "text-red-500"
                      : "text-green-600 dark:text-green-500",
                  )}
                >
                  {message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={isPending || !form.formState.isValid}
              >
                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isPending ? "Sending..." : "Resend Verification Email"}
              </Button>

              <div className="mt-4 text-center text-sm">
                Back to{" "}
                <button
                  type="button"
                  className="underline underline-offset-4 text-primary hover:text-primary/80"
                  onClick={() => navigate({ to: "/login" })}
                >
                  Login
                </button>
                {" • "}
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
