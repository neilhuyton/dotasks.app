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
    mode: "onSubmit",              // Changed to onSubmit – stops early validation/focus fights
    shouldFocusError: false,       // Prevents auto-focus on fields during submit
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

      setTimeout(() => {
        navigate({ to: "/" });
      }, 80);
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

  // Force RHF to detect autofill / pre-filled values from password manager
  useEffect(() => {
    const trySyncAutofill = () => {
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement | null;
      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement | null;

      let changed = false;

      if (emailInput?.value && form.getValues("email") !== emailInput.value) {
        form.setValue("email", emailInput.value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        changed = true;
      }

      if (passwordInput?.value && form.getValues("password") !== passwordInput.value) {
        form.setValue("password", passwordInput.value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        changed = true;
      }

      if (changed) {
        form.trigger(); // Re-validate so errors disappear if valid
      }
    };

    // Run once on mount + small delay for autofill to kick in
    const timer = setTimeout(trySyncAutofill, 150);

    // Also run when inputs get focus (some managers fill on focus)
    const emailEl = document.querySelector('input[type="email"]');
    const pwEl = document.querySelector('input[type="password"]');

    if (emailEl) emailEl.addEventListener("focus", trySyncAutofill);
    if (pwEl) pwEl.addEventListener("focus", trySyncAutofill);

    return () => {
      clearTimeout(timer);
      if (emailEl) emailEl.removeEventListener("focus", trySyncAutofill);
      if (pwEl) pwEl.removeEventListener("focus", trySyncAutofill);
    };
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