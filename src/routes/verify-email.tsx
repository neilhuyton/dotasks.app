// src/routes/verify-email.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { trpc } from "@/trpc"; // adjust to your actual trpc client import path

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    token:
      typeof search.token === "string" && search.token.trim().length > 0
        ? search.token.trim()
        : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { token } = Route.useSearch();
  const navigate = Route.useNavigate();

  const mutation = trpc.verifyEmail.useMutation();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const result = await mutation.mutateAsync({ token });

        if (cancelled) return;

        setStatus("success");
        setMessage(
          result.message || "Email verified successfully! You can now log in.",
        );

        setTimeout(() => {
          navigate({ to: "/login" });
        }, 2200);
      } catch (err) {
        if (cancelled) return;

        setStatus("error");
        setMessage(
          err instanceof Error && "message" in err
            ? (err as { message: string }).message
            : "Verification failed. The link may be invalid or expired.",
        );
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token, mutation.mutateAsync, navigate]);

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-3xl font-bold text-center">
          Email Verification
        </h1>

        {isLoading && (
          <div
            data-testid="verify-email-loading"
            className="text-center text-lg text-muted-foreground animate-pulse"
          >
            {message}
          </div>
        )}

        {!isLoading && (
          <div
            data-testid="verify-message"
            className={`rounded-xl p-8 text-center text-lg font-medium shadow-sm border ${
              isSuccess
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {isSuccess && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Redirecting to login...
          </p>
        )}
      </div>
    </div>
  );
}
