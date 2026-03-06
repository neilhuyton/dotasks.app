// src/app/routes/reset-password.tsx

import { createFileRoute } from "@tanstack/react-router";
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
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.email("Please enter a valid email").trim().toLowerCase(),
});

type FormData = z.infer<typeof formSchema>;

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = Route.useNavigate();

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const onSubmit = async (values: FormData) => {
    setMessage(null);
    setIsPending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage(
        "Password reset link sent! Check your email (including spam/junk).",
      );
      form.reset();
    }

    setIsPending(false);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <div className="w-full max-w-md bg-background rounded-lg p-6 mt-20">
        <h1 className="text-2xl font-bold text-center mb-4">
          Reset your password
        </h1>

        <p className="text-muted-foreground text-center mb-8">
          Enter your email to receive a password reset link
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      type="email"
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
                  message.includes("Error")
                    ? "text-destructive"
                    : "text-green-600",
                )}
              >
                {message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !form.formState.isValid}
            >
              {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isPending ? "Sending…" : "Send Reset Link"}
            </Button>

            <div className="text-center text-sm mt-4">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate({ to: "/login" })}
              >
                Back to login
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
