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
import { Logo } from "@/app/components/Logo";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "server/trpc";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email").trim().toLowerCase(),
});

type FormData = z.infer<typeof formSchema>;

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = Route.useNavigate();
  const { show: showBanner } = useBannerStore();

  const trpc = useTRPC();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const mutation = useMutation(
    trpc.resetPassword.request.mutationOptions({
      onSuccess: (data) => {
        const message = data?.message || "Reset link sent! Check your inbox.";
        showBanner({
          message,
          variant: "success",
          duration: 5500,
        });

        form.reset();
      },

      onError: (err: TRPCClientErrorLike<AppRouter>) => {
        let msg = "Could not send reset link. Please try again.";
        if (err?.data?.code === "NOT_FOUND") {
          msg = "Email not found.";
        } else if (err.message?.toLowerCase().includes("too many")) {
          msg = "Too many requests. Try again later.";
        } else if (err.message) {
          msg = err.message;
        }
        showBanner({ message: msg, variant: "error", duration: 5000 });
      },
    }),
  );

  function onSubmit(values: FormData) {
    mutation.mutate({ email: values.email });
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
          Enter your email to receive a password reset link
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6"
            data-testid="reset-password-form"
          >
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
                      disabled={mutation.isPending}
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
              disabled={
                mutation.isPending ||
                !form.formState.isDirty ||
                !form.formState.isValid
              }
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              )}
              {mutation.isPending ? "Sending…" : "Send Reset Link"}
            </Button>

            <div className="text-center text-sm">
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
