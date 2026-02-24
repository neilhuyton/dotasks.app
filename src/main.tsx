// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router";
import { trpcClient } from "@/client";
import { trpc } from "@/trpc";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { queryClient } from "@/queryClient";
import { RealtimeListeners } from "@/components/RealtimeListeners";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <ThemeProvider
          defaultTheme="dark"
          storageKey="vite-ui-theme"
          enableSystem={true}
        >
          <RouterProvider router={router} />
          <RealtimeListeners />
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </trpc.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
