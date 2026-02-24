// src/hooks/useRegisterPage.ts

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

const registerSchema = z
  .object({
    email: z
      .string()
      .email({ message: "Please enter a valid email address" })
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(128, { message: "Password is too long" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

type RegisterPayload = Pick<RegisterFormValues, "email" | "password">;

interface RegisterResponse {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
  message: string;
}

interface UseRegisterReturn {
  form: ReturnType<typeof useForm<RegisterFormValues>>;
  message: string | null;
  isRegistering: boolean;
  handleRegister: (data: RegisterFormValues) => void;
}

export const useRegisterPage = (): UseRegisterReturn => {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const [message, setMessage] = useState<string | null>(null);
  const { login } = useAuthStore();

  const registerMutation = trpc.register.useMutation({
    onMutate: () => {
      setMessage(null);
    },
    onSuccess: (data: RegisterResponse) => {
      setMessage(data.message || "Registration successful! Redirecting...");
      login(data.user.id, data.accessToken, data.refreshToken);
    },
    onError: (error) => {
      const errorMessage = error?.message || "Failed to register";
      setMessage(`Registration failed: ${errorMessage}`);
    },
  });

  useEffect(() => {
    const subscription = form.watch(() => setMessage(null));
    return () => subscription.unsubscribe();
  }, [form]);

  const handleRegister = (data: RegisterFormValues) => {
    const payload: RegisterPayload = {
      email: data.email,
      password: data.password,
    };

    registerMutation.mutate(payload);
  };

  return {
    form,
    message,
    isRegistering: registerMutation.isPending,
    handleRegister,
  };
};
