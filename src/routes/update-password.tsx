import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import {
  UpdatePasswordForm,
  type UpdatePasswordFormValues,
} from "@steel-cut/steel-lib";
import { useState } from "react";

export const Route = createFileRoute("/update-password")({
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const { updateUserPassword } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (values: UpdatePasswordFormValues) => {
    setIsLoading(true);

    try {
      const { error } = await updateUserPassword(values.password);

      if (error) {
        return { error };
      }

      setTimeout(() => {
        navigate({ to: "/login" });
      }, 2200);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <UpdatePasswordForm
        onSubmit={handleUpdate}
        onLogin={() => navigate({ to: "/login" })}
        isLoading={isLoading}
        className="mt-20"
      />
    </div>
  );
}
