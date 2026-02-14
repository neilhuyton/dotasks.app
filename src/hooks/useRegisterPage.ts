// src/hooks/useRegisterPage.ts

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
// import { useNavigate } from "@tanstack/react-router";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

type FormValues = z.infer<typeof formSchema>;

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
  form: ReturnType<typeof useForm<FormValues>>;
  message: string | null;
  isRegistering: boolean;
  handleRegister: (data: FormValues) => Promise<void>;
}

export const useRegisterPage = (): UseRegisterReturn => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const [message, setMessage] = useState<string | null>(null);
  const { login } = useAuthStore();
  // const navigate = useNavigate();

  const registerMutation = trpc.register.useMutation({
    onSuccess: (data: RegisterResponse) => {
      setMessage(data.message || "Registration successful! Redirecting...");
      login(data.user.id, data.accessToken, data.refreshToken);

      // setTimeout(() => {
      //   form.reset();
      //   navigate({ to: "/" }); // ← changed: go to dashboard instead of login
      // }, 2500);
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to register";
      setMessage(`Registration failed: ${errorMessage}`);
    },
  });

  useEffect(() => {
    const subscription = form.watch(() => setMessage(null));
    return () => subscription.unsubscribe();
  }, [form]);

  const handleRegister = async (data: FormValues) => {
    const isValid = await form.trigger();
    if (!isValid) return;
    await registerMutation.mutateAsync(data);
  };

  return {
    form,
    message,
    isRegistering: registerMutation.isPending,
    handleRegister,
  };
};
