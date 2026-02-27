// src/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router";
import { queryClient } from "@/queryClient";
import { ThemeProvider } from "./app/components/ThemeProvider";
import { RealtimeListeners } from "@/app/components/RealtimeListeners";
import { PersistedQueryClientProvider } from "./app/components/PersistedQueryClientProvider";
import { TRPCProvider, trpcClient } from "@/trpc";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistedQueryClientProvider>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <ThemeProvider
          defaultTheme="dark"
          storageKey="vite-ui-theme"
          enableSystem={true}
        >
          <RouterProvider router={router} />
          <RealtimeListeners />
        </ThemeProvider>
      </TRPCProvider>
    </PersistedQueryClientProvider>
  </StrictMode>,
);
