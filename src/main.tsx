// src/main.tsx

import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { router } from "@/router";
import { queryClient } from "@/queryClient";
import { TRPCProvider, trpcClient } from "@/trpc";

import { ThemeProvider } from "./app/components/ThemeProvider";
import { RealtimeListeners } from "@/app/components/RealtimeListeners";
import { PersistedQueryClientProvider } from "./app/components/PersistedQueryClientProvider";

import { ErrorBoundary } from "react-error-boundary";

import "./sentry";

import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
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
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
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
  </StrictMode>,
);
