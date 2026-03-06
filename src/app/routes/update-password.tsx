// src/app/routes/update-password.tsx

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
import { useState, useEffect } from "react";
import { useAuthStore } from "@/shared/store/authStore";
import { cn } from "@/lib/utils";

const formSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

export const Route = createFileRoute("/update-password")({
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = Route.useNavigate();
  const { supabase } = useAuthStore();

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });

  useEffect(() => {
    // Verify we have a valid session from the reset link
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMessage("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, [supabase]);

  const onSubmit = async (values: FormData) => {
    setMessage(null);
    setIsPending(true);

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Password updated successfully! Redirecting to login...");
      setIsSuccess(true);
      setTimeout(() => navigate({ to: "/login" }), 2500);
    }

    setIsPending(false);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center p-4">
      <div className="w-full max-w-md bg-background rounded-lg p-6 mt-20">
        <h1 className="text-2xl font-bold text-center mb-4">
          Set New Password
        </h1>

        {message && (
          <p
            className={cn(
              "text-center mb-6",
              isSuccess ? "text-green-600" : "text-destructive",
            )}
          >
            {message}
          </p>
        )}

        {!isSuccess && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
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
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || !form.formState.isValid}
              >
                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Form>
        )}

        <div className="text-center text-sm mt-6">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => navigate({ to: "/login" })}
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
