// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {  trpcClient } from "@/client";  // adjust import — where you create trpcClient
import { trpc } from "@/trpc";
import "./index.css";

// Create clients once (outside render to avoid re-creation on re-renders)
const queryClient = new QueryClient({
  // Optional defaults — adjust as needed
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute example
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>
);