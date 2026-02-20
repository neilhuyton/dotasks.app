// src/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcClient } from "@/client";
import { trpc } from "@/trpc";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          defaultTheme="dark"
          storageKey="vite-ui-theme"
          enableSystem={true}
        >
          <RouterProvider router={router} />
        </ThemeProvider>

        {/* Global Sonner config */}
        <Toaster
          position="top-center"
          richColors
          duration={5000}
          closeButton
          toastOptions={{
            classNames: {
              toast: "border bg-card text-card-foreground shadow-lg",
              title: "text-lg font-semibold",
              description: "text-sm opacity-90",
              success: "border-green-500/30 bg-green-950/20",
              error: "border-red-500/30 bg-red-950/20",
            },
          }}
        />
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
