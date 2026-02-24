// src/routes/verify-email.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { trpc } from "@/trpc";
import { cn } from "@/lib/utils";

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
      setMessage("No verification token provided.");
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
              : "Something went wrong"}
        </p>

        <div className="w-full py-4">
          <p
            data-testid="verify-message"
            className={cn(
              "text-sm text-center",
              isLoading
                ? "text-muted-foreground animate-pulse"
                : isSuccess
                  ? "text-green-600"
                  : "text-red-600",
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
