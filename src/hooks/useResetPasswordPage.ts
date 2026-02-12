// src/hooks/useResetPasswordPage.ts

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "../trpc";
import { useState } from "react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type FormValues = z.infer<typeof formSchema>;

interface UseResetPasswordReturn {
  form: ReturnType<typeof useForm<FormValues>>;
  message: string | null;
  isPending: boolean;
  handleSubmit: (data: FormValues) => Promise<void>;
}

export const useResetPasswordPage = (): UseResetPasswordReturn => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const [message, setMessage] = useState<string | null>(null);

  const resetMutation = trpc.resetPassword.request.useMutation({
    onSuccess: (data) => {
      setMessage(data.message);
      form.reset();
    },
    onError: (error) => {
      setMessage(`Failed to send reset link: ${error.message}`);
    },
  });

  const handleSubmit = async (data: FormValues) => {
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    resetMutation.mutate(data);
  };

  return {
    form,
    message,
    isPending: resetMutation.isPending,
    handleSubmit,
  };
};
