import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import {
  ResetPasswordForm,
  type ResetPasswordFormValues,
} from "@steel-cut/steel-lib";
import { useState } from "react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = Route.useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/update-password`,
        },
      );

      if (error) {
        return { error };
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <ResetPasswordForm
        onSubmit={handleReset}
        onLogin={() => navigate({ to: "/login" })}
        isLoading={isLoading}
        className="mt-20"
      />
    </div>
  );
}
