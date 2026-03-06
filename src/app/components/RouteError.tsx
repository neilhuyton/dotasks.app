import { Link } from "@tanstack/react-router";
import { Button } from "@/app/components/ui/button";

interface RouteErrorProps {
  error: unknown;
  reset?: () => void;
  title?: string;
  message?: string;
  backTo?: string;
  backLabel?: string;
}

export function RouteError({
  error,
  reset,
  title = "Something went wrong",
  message,
  backTo = "/",
  backLabel = "Go Home",
}: RouteErrorProps) {
  const errorMessage =
    message ||
    (error instanceof Error ? error.message : "An unexpected error occurred");

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold text-destructive mb-4">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-8">{errorMessage}</p>

      <div className="flex flex-col sm:flex-row gap-4">
        {reset && (
          <Button onClick={reset} className="min-w-[140px]">
            Try Again
          </Button>
        )}
        <Button variant="outline" asChild className="min-w-[140px]">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      </div>

      {/* Optional dev-only stack */}
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mt-12 max-w-3xl overflow-auto rounded bg-muted p-4 text-left text-sm text-destructive/80">
          {error.stack}
        </pre>
      )}
    </div>
  );
}
