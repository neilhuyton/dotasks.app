// src/app/Root.tsx

import { Suspense, useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";

import { router } from "@/router";
import { ThemeProvider } from "./components/ThemeProvider";
import { RealtimeListeners } from "@/app/components/RealtimeListeners";
import { PersistedQueryClientProvider } from "./components/PersistedQueryClientProvider";

import { TRPCProvider } from "@/trpc";
import { trpcClient } from "@/trpc";
import { getQueryClient } from "@/queryClient";
import { ErrorBoundary } from "react-error-boundary";
import { useAuthStore } from "@/shared/store/authStore";

export function Root() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold text-destructive">
            Something went wrong
          </h1>
          <p className="mt-4 text-muted-foreground">
            An unexpected error occurred. Please refresh the page.
          </p>
          <button
            className="mt-6 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      }
    >
      <PersistedQueryClientProvider>
        <TRPCProvider trpcClient={trpcClient} queryClient={getQueryClient()}>
          <ThemeProvider
            defaultTheme="dark"
            storageKey="vite-ui-theme"
            enableSystem={true}
          >
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              }
            >
              <RouterProvider router={router} />
            </Suspense>

            <RealtimeListeners />
          </ThemeProvider>
        </TRPCProvider>
      </PersistedQueryClientProvider>
    </ErrorBoundary>
  );
}
