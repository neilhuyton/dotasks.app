// src/hooks/useVerifyEmailPage.ts
import { useEffect, useState } from "react";
import { trpc } from "../trpc";

export function useVerifyEmailPage(token: string) {
  const [message, setMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  const verifyMutation = trpc.verifyEmail.useMutation({
    onSuccess: (data) => {
      setMessage(data.message || "Email verified successfully! You can now log in.");
      setIsSuccess(true);
      setIsVerifying(false);
    },
    onError: (error) => {
      setMessage(error.message || "Invalid or expired verification token.");
      setIsSuccess(false);
      setIsVerifying(false);
    },
  });

  useEffect(() => {
    if (!token) {
      setMessage("Missing verification token.");
      setIsVerifying(false);
      return;
    }

    verifyMutation.mutate({ token });
  }, [token]);

  return { message, isVerifying, isSuccess };
}