// src/hooks/useLogin.ts
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";               // ← added
import { useNavigate } from "@tanstack/react-router"; // or your router's hook
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
    mode: "onChange",
  });

  const [message, setMessage] = useState<string | null>(null);

  const loginMutation = trpc.login.useMutation({
    onMutate: () => setMessage(null),

    onSuccess: (data: LoginResponse) => {
      setMessage("Login successful!");

      // Force synchronous store update + give React a tick to re-render
      flushSync(() => {
        login(data.user.id, data.accessToken, data.refreshToken);
      });

      form.reset();

      // Small delay helps avoid race in most cases (especially with zustand persist)
      setTimeout(() => {
        navigate({ to: "/" }); // or "/dashboard" — wherever your protected route is
      }, 80); // 0–150 ms usually enough
    },

    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setMessage(`Login failed: ${error.message || "Unknown error"}`);
    },
  });

  useEffect(() => {
    const sub = form.watch((_, { name }) => {
      if (name === "email" || name === "password") setMessage(null);
    });
    return () => sub.unsubscribe();
  }, [form]);

  const handleSubmit = async (values: FormValues) => {
    await form.trigger();
    if (!form.formState.isValid) return;
    await loginMutation.mutateAsync(values);
  };

  return {
    form,
    message,
    isPending: loginMutation.isPending,
    handleSubmit,
  };
};