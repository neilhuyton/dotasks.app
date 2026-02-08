// src/hooks/useVerifyEmail.ts
import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { trpc } from "../trpc";

export function useVerifyEmail() {
  const { token } = useSearch({ from: "/verify-email" });
  const [message, setMessage] = useState<string | null>(null);

  const verifyEmailMutation = trpc.verifyEmail.useMutation({
    onSuccess: (data) => {
      setMessage(data.message);
    },
    onError: (error) => {
      console.log("ERROR SHAPE:", error.shape, "MESSAGE:", error.message);
      setMessage(
        error.shape?.message ||
          error.message ||
          "Unknown error during verification",
      );
    },
  });

  useEffect(() => {
    if (token && !verifyEmailMutation.isPending && !message) {
      verifyEmailMutation.mutate({ token });
    } else if (!token) {
      setMessage("No verification token provided");
    }
  }, [token, verifyEmailMutation.isPending, message, verifyEmailMutation]);

  return {
    message,
    isVerifying: verifyEmailMutation.isPending,
    isSuccess: message?.includes("successfully"),
  };
}
