// src/hooks/useProfilePage.ts

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { useEffect, useState } from "react";
import { type TRPCClientErrorLike } from "@trpc/client";
import type {
  inferProcedureOutput,
  inferProcedureInput,
  TRPCDefaultErrorShape,
} from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "@tanstack/react-router";

interface EmailFormValues {
  email: string;
}

interface PasswordFormValues {
  email: string;
}

const emailFormSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
});

const passwordFormSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
});

interface UseProfileReturn {
  emailForm: ReturnType<typeof useForm<EmailFormValues>>;
  passwordForm: ReturnType<typeof useForm<PasswordFormValues>>;
  emailMessage: string | null;
  passwordMessage: string | null;
  isEmailPending: boolean;
  isPasswordPending: boolean;
  handleEmailSubmit: (data: EmailFormValues) => Promise<void>;
  handlePasswordSubmit: (data: PasswordFormValues) => Promise<void>;
  handleLogout: () => void;
  currentEmail: string | null;
  isUserLoading: boolean;
}

export const useProfilePage = (): UseProfileReturn => {
  const { logout } = useAuthStore();
  const router = useRouter();

  // Fetch current user data (including email)
  const { data: currentUser, isLoading: isUserLoading } =
    trpc.user.getCurrent.useQuery(undefined, {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    });

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const updateEmailMutation = trpc.user.updateEmail.useMutation({
    onMutate: () => {
      setEmailMessage(null);
    },
    onSuccess: (data) => {
      setEmailMessage(data.message || "Email updated successfully");
      emailForm.reset();
    },
    onError: (
      error: TRPCClientErrorLike<{
        input: inferProcedureInput<AppRouter["user"]["updateEmail"]>;
        output: inferProcedureOutput<AppRouter["user"]["updateEmail"]>;
        transformer: false;
        errorShape: TRPCDefaultErrorShape;
      }>,
    ) => {
      setEmailMessage(error.message || "Failed to update email");
    },
    onSettled: () => {},
  });

  const resetPasswordMutation = trpc.resetPassword.request.useMutation({
    onMutate: () => {
      setPasswordMessage(null);
    },
    onSuccess: (data) => {
      setPasswordMessage(data.message || "Reset link sent to your email");
      passwordForm.reset();
    },
    onError: (
      error: TRPCClientErrorLike<{
        input: inferProcedureInput<AppRouter["resetPassword"]["request"]>;
        output: inferProcedureOutput<AppRouter["resetPassword"]["request"]>;
        transformer: false;
        errorShape: TRPCDefaultErrorShape;
      }>,
    ) => {
      setPasswordMessage(error.message || "Failed to send reset email");
    },
    onSettled: () => {},
  });

  useEffect(() => {
    const emailSubscription = emailForm.watch((_, { name }) => {
      if (name === "email") {
        setEmailMessage(null);
      }
    });
    const passwordSubscription = passwordForm.watch((_, { name }) => {
      if (name === "email") {
        setPasswordMessage(null);
      }
    });
    return () => {
      emailSubscription.unsubscribe();
      passwordSubscription.unsubscribe();
    };
  }, [emailForm, passwordForm]);

  const handleEmailSubmit = async (data: EmailFormValues) => {
    const isValid = await emailForm.trigger();
    if (!isValid) {
      return;
    }
    await updateEmailMutation.mutateAsync(data);
  };

  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    const isValid = await passwordForm.trigger();
    if (!isValid) {
      return;
    }
    await resetPasswordMutation.mutateAsync({ email: data.email });
  };

  return {
    emailForm,
    passwordForm,
    emailMessage,
    passwordMessage,
    isEmailPending: updateEmailMutation.isPending,
    isPasswordPending: resetPasswordMutation.isPending,
    handleEmailSubmit,
    handlePasswordSubmit,
    handleLogout,
    currentEmail: currentUser?.email ?? null,
    isUserLoading,
  };
};
