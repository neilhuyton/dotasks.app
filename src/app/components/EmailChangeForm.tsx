// src/app/components/EmailChangeForm.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useBannerStore } from "@/shared/store/bannerStore";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Mail, Loader2 } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface Props {
  currentEmail: string;
  hasUser: boolean;
}

export default function EmailChangeForm({ currentEmail, hasUser }: Props) {
  const { show: showBanner } = useBannerStore();
  const [emailChanging, setEmailChanging] = useState(false);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const handleSubmit = async ({ email }: EmailFormData) => {
    const newEmail = email.trim();
    if (newEmail === currentEmail) {
      showBanner({
        message: "This is already your current email.",
        variant: "info",
        duration: 3000,
      });
      form.reset();
      return;
    }

    setEmailChanging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No active session. Please log in again.");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: newEmail }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Request failed (${res.status})`);
      }

      form.reset();
      showBanner({
        message:
          "Confirmation emails sent to both addresses. Check inboxes (including spam) and click verification links.",
        variant: "success",
        duration: 10000,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      showBanner({
        message: `Failed to change email: ${msg}`,
        variant: "error",
        duration: 5000,
      });
    } finally {
      setEmailChanging(false);
    }
  };

  return (
    <section>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        data-testid="email-form"
      >
        <div className="space-y-3">
          <Label htmlFor="new-email" className="text-sm font-medium block">
            New Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              id="new-email"
              type="email"
              placeholder="your.new@email.com"
              className="pl-10"
              disabled={emailChanging || !hasUser}
              {...form.register("email")}
              data-testid="email-input"
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            type="submit"
            variant="outline"
            disabled={emailChanging || !form.formState.isDirty || !hasUser}
            className="w-full sm:w-auto px-6"
            data-testid="email-submit"
          >
            {emailChanging && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {emailChanging ? "Requesting change..." : "Change Email"}
          </Button>

          {emailChanging && (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              This should take just a few seconds.
              <br />
              Emails will be sent to both addresses — check spam if needed.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}