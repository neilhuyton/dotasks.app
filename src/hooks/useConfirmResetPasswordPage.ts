// src/hooks/useConfirmResetPasswordPage.ts

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { useState, useEffect } from "react";

const formSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // show error under confirm field
  });

type FormValues = z.infer<typeof formSchema>;

interface UseConfirmResetPasswordReturn {
  form: ReturnType<typeof useForm<FormValues>>;
  message: string | null;
  isPending: boolean;
  handleSubmit: (data: FormValues, onSwitchToLogin: () => void) => void;
}

export const useConfirmResetPasswordPage = (
  token: string,
): UseConfirmResetPasswordReturn => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const [message, setMessage] = useState<string | null>(null);

  const resetMutation = trpc.resetPassword.confirm.useMutation({
    onMutate: () => {
      setMessage(null);
    },
    onSuccess: () => {
      setMessage("Password reset successfully!");
      // Give user time to see success message before navigation
      setTimeout(() => {
        form.reset();
        setMessage(null);
      }, 3000);
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to reset password";
      setMessage(`Failed to reset password: ${errorMessage}`);
    },
  });

  useEffect(() => {
    const subscription = form.watch(() => {
      setMessage(null);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = (data: FormValues, onSwitchToLogin: () => void) => {
    // Validate form client-side first
    form.trigger().then((isValid) => {
      if (!isValid) return;

      if (!token) {
        setMessage("Failed to reset password: Reset token is missing");
        return;
      }

      resetMutation.mutate(
        {
          token,
          newPassword: data.newPassword,
        },
        {
          onSuccess: () => {
            onSwitchToLogin();
          },
        },
      );
    });
  };

  return {
    form,
    message,
    isPending: resetMutation.isPending,
    handleSubmit,
  };
};
