// src/hooks/useProfilePage.ts

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "@tanstack/react-router";

interface EmailFormValues {
  email: string;
}

interface PasswordFormValues {
  email: string;
}

const emailFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

const passwordFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

interface UseProfileReturn {
  emailForm: ReturnType<typeof useForm<EmailFormValues>>;
  passwordForm: ReturnType<typeof useForm<PasswordFormValues>>;
  emailMessage: string | null;
  passwordMessage: string | null;
  isEmailPending: boolean;
  isPasswordPending: boolean;
  handleEmailSubmit: (data: EmailFormValues) => void;          // ← no longer Promise
  handlePasswordSubmit: (data: PasswordFormValues) => void;    // ← no longer Promise
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
    onError: (error) => {
      let msg = "Failed to update email. Please try again.";

      if (error.data?.code === "CONFLICT") {
        msg = "This email is already in use by another account.";
      } else if (error.data?.httpStatus === 404) {
        msg = "User not found.";
      } else if (error.message) {
        msg = error.message;
      }

      setEmailMessage(msg);
    },
  });

  const resetPasswordMutation = trpc.resetPassword.request.useMutation({
    onMutate: () => {
      setPasswordMessage(null);
    },
    onSuccess: (data) => {
      setPasswordMessage(data.message || "Reset link sent to your email");
      passwordForm.reset();
    },
    onError: (error) => {
      let msg = "Failed to send reset email.";
      if (error.message) {
        msg = error.message;
      }
      setPasswordMessage(msg);
    },
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

  const handleEmailSubmit = (data: EmailFormValues) => {
    emailForm.trigger().then((isValid) => {
      if (!isValid) return;
      updateEmailMutation.mutate(data);   // ← changed to .mutate()
    });
  };

  const handlePasswordSubmit = (data: PasswordFormValues) => {
    passwordForm.trigger().then((isValid) => {
      if (!isValid) return;
      resetPasswordMutation.mutate({ email: data.email });   // ← changed to .mutate()
    });
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