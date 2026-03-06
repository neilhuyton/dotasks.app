// src/app/components/PasswordResetForm.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useBannerStore } from "@/shared/store/bannerStore";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Lock, Loader2 } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

type ResetFormData = z.infer<typeof emailSchema>;

export default function PasswordResetForm() {
  const { show: showBanner } = useBannerStore();
  const [resetPending, setResetPending] = useState(false);

  const form = useForm<ResetFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.getValues("email").trim();

    if (!email || !emailSchema.safeParse({ email }).success) {
      showBanner({
        message: "Please enter a valid email address.",
        variant: "error",
        duration: 4000,
      });
      return;
    }

    setResetPending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;

      showBanner({
        message: "Password reset link sent. Check your email (including spam).",
        variant: "success",
        duration: 5000,
      });
      form.reset();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send reset link.";
      showBanner({
        message: `Error: ${msg}`,
        variant: "error",
        duration: 5000,
      });
    } finally {
      setResetPending(false);
    }
  };

  return (
    <section className="pt-8 border-t space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="password-form"
      >
        <div className="space-y-3">
          <Label htmlFor="reset-email" className="text-sm font-medium block">
            Email for Reset Link
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              id="reset-email"
              type="email"
              placeholder="your@email.com"
              className="pl-10"
              disabled={resetPending}
              {...form.register("email")}
              data-testid="password-input"
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            type="submit"
            variant="outline"
            disabled={resetPending || !form.formState.isDirty}
            className="w-full sm:w-auto px-6"
            data-testid="reset-submit"
          >
            {resetPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {resetPending ? "Sending..." : "Send Reset Link"}
          </Button>
        </div>
      </form>
    </section>
  );
}
