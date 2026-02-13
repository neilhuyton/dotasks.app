// src/hooks/useLogin.ts

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router"; // ← change here
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "server/trpc";

// Adjust this interface to match your actual tRPC response shape
interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string; // or `${string}-${string}-...` if you want the literal
  message: string;
}

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

type FormValues = z.infer<typeof formSchema>;

interface UseLoginReturn {
  form: ReturnType<typeof useForm<FormValues>>;
  message: string | null;
  isPending: boolean;
  handleSubmit: (data: FormValues) => Promise<void>;
}

export const useLoginPage = (): UseLoginReturn => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const [message, setMessage] = useState<string | null>(null);
  const { login } = useAuthStore();

  // Use useNavigate() instead of useRouter().navigate
  const navigate = useNavigate();

  const loginMutation = trpc.login.useMutation({
    onMutate: () => {
      setMessage(null);
    },
    onSuccess: (data: LoginResponse) => {
      setMessage("Login successful!");
      // Update store with the correct fields
      login(data.user.id, data.accessToken, data.refreshToken);

      form.reset();

      // Navigate — this is more reliable in v1 than router.navigate in callbacks
      navigate({ to: "/weight" });
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setMessage(`Login failed: ${error.message || "Unknown error"}`);
    },
  });

  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      if (name === "email" || name === "password") {
        setMessage(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = async (data: FormValues) => {
    const isValid = await form.trigger();
    if (!isValid) return;
    await loginMutation.mutateAsync(data);
  };

  return {
    form,
    message,
    isPending: loginMutation.isPending,
    handleSubmit,
  };
};
