// src/hooks/useLogin.ts

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "../../server/trpc";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof formSchema>;

interface LoginResponse {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
  message?: string;
}

export const useLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    shouldFocusError: false,
  });

  const [message, setMessage] = useState<string | null>(null);

  const loginMutation = trpc.login.useMutation({
    onMutate: () => setMessage(null),

    onSuccess: (data: LoginResponse) => {
      setMessage("Login successful!");

      flushSync(() => {
        login(data.user.id, data.accessToken, data.refreshToken);
      });

      form.reset();

      navigate({ to: "/lists" });
    },

    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setMessage(`Login failed: ${error.message || "Unknown error"}`);
    },
  });

  // Clear error/success message when user starts typing again
  useEffect(() => {
    const sub = form.watch((_, { name }) => {
      if (name === "email" || name === "password") {
        setMessage(null);
      }
    });

    return () => sub.unsubscribe();
  }, [form]);

  const handleSubmit = async (values: FormValues) => {
    await loginMutation.mutateAsync(values);
  };

  return {
    form,
    message,
    isPending: loginMutation.isPending,
    handleSubmit,
  };
};
