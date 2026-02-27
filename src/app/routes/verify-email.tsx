// src/app/routes/verify-email.tsx

import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useMutation } from "@tanstack/react-query";
import type { AppRouter } from "server/trpc";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    token:
      typeof search.token === "string" && search.token.trim().length > 0
        ? search.token.trim()
        : undefined,
  }),

  component: VerifyEmailPage,
});

type VerifyEmailOutput = {
  message: string;
  email: string;
};

function VerifyEmailPage() {
  const search = useSearch({ from: Route.fullPath });
  const token = search.token;

  const trpc = useTRPC();

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const hasVerified = useRef(false);

  const mutation = useMutation(
    trpc.verifyEmail.mutationOptions({
      onSuccess: (result: VerifyEmailOutput) => {
        setStatus("success");
        setMessage(
          result.message || "Email verified successfully! You can now log in.",
        );
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
        setStatus("error");
        setMessage(
          err.message ||
            "Verification failed. The link may be invalid or expired.",
        );
      },
    }),
  );

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    const verify = async () => {
      setStatus("loading");
      setMessage("Verifying your email...");

      try {
        await mutation.mutateAsync({ token });
      } catch {
        // handled by onError
      }
    };

    verify();

    return () => {
      mutation.reset();
    };
  }, [token, mutation]); // ← added mutation to deps (good practice)

  const isLoading = status === "loading" || mutation.isPending;
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <div className="w-full max-w-md bg-background rounded-lg p-4 flex flex-col items-center mt-16 sm:mt-20">
        <h1
          className="text-2xl font-bold text-center mb-4"
          role="heading"
          aria-level={1}
        >
          Email Verification
        </h1>

        <p className="text-muted-foreground text-center mb-6">
          {isLoading
            ? "Please wait while we verify your email..."
            : isSuccess
              ? "Almost there..."
              : isError
                ? "Something went wrong"
                : "Preparing verification..."}
        </p>

        <div className="w-full py-4">
          <p
            data-testid="verify-message"
            className={cn(
              "text-sm text-center",
              isLoading && "text-muted-foreground animate-pulse",
              isSuccess && "text-green-600 font-medium",
              isError && "text-red-600",
            )}
          >
            {message}
          </p>
        </div>

        {isSuccess && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Redirecting to login...
          </p>
        )}
      </div>
    </div>
  );
}
