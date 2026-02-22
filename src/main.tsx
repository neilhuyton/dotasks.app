// src/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router/router";
import { QueryClient } from "@tanstack/react-query"; // ← remove QueryClientProvider import
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"; // ← NEW
import { trpcClient } from "@/client";
import { trpc } from "@/trpc";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { get, set, del } from "idb-keyval"; // ← NEW
import type {
  Persister,
  PersistedClient,
} from "@tanstack/react-query-persist-client"; // ← NEW

// ────────────────────────────────────────────────
// IndexedDB Persister (typed & minimal)
// ────────────────────────────────────────────────
const CACHE_KEY = "my-app-query-cache-v1"; // Change / bump if you change cache shape later

const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(CACHE_KEY, client);
  },
  restoreClient: async (): Promise<PersistedClient | undefined> => {
    return await get<PersistedClient>(CACHE_KEY);
  },
  removeClient: async () => {
    await del(CACHE_KEY);
  },
};

// Use the SAME queryClient instance you already had
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
      {/* Replaced QueryClientProvider with PersistQueryClientProvider */}
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: idbPersister,
          // Optional: limit how long persisted data lives (e.g. 30 days)
          // maxAge: 1000 * 60 * 60 * 24 * 30,
        }}
        onSuccess={() => {
          // Good practice: resume any paused mutations after restore
          queryClient.resumePausedMutations?.();
        }}
      >
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
      </PersistQueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
