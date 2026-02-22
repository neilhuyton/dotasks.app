// src/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router/router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { trpcClient } from "@/client";
import { trpc } from "@/trpc";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { get, set, del } from "idb-keyval";
import type {
  Persister,
  PersistedClient,
} from "@tanstack/react-query-persist-client";

// ────────────────────────────────────────────────
// IndexedDB Persister (typed & minimal)
// ────────────────────────────────────────────────
const CACHE_KEY = "my-app-query-cache-v1";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: idbPersister,
        }}
        onSuccess={() => {
          queryClient.resumePausedMutations?.();
        }}
      >
        <ThemeProvider
          defaultTheme="dark"
          storageKey="vite-ui-theme"
          enableSystem={true}
        >
          <RouterProvider router={router} />

          {/* True full-width banner Toaster – no edge spacing */}
{/* True full-width banner Toaster – no edge spacing */}
{/* True full-width compact banner Toaster – smaller text, minimal spacing, no close button */}
<Toaster
  position="bottom-center"
  richColors
  duration={5500}
  closeButton={false}           // ← removes close button entirely
  visibleToasts={3}
  offset={0}
  className="fixed inset-x-0 bottom-0 w-screen max-w-none m-0 p-0 pointer-events-none z-[100]"
  style={{
    inset: "auto 0 0 0",
    width: "100vw",
    maxWidth: "100vw",
    margin: 0,
    padding: 0,
  }}
  toastOptions={{
    className:
      "w-screen max-w-none min-w-full rounded-none border-x-0 border-t-0 border-b border-border/20 " +
      "bg-card text-card-foreground shadow-xl pointer-events-auto select-text",

    classNames: {
      toast:
        "!w-full max-w-none min-w-full !rounded-none border-0 " +
        "m-0 p-0 " +
        "min-h-[52px] items-center justify-center " +   // shorter height
        "px-5 sm:px-6 md:px-8 lg:px-10",                // tighter horizontal padding

      title: "text-base font-semibold tracking-tight m-0 leading-tight",  // smaller title
      description: "text-sm opacity-90 mt-0.5 leading-snug m-0",          // smaller desc + tight spacing

      // Success: light green-50, no border
      success:
        "border-none bg-green-50 text-green-950 " +
        "[&_.sonner-title]:text-green-900 [&_.sonner-description]:text-green-800",

      // Other variants (kept simple, no border if you want consistency)
      error:
        "border-none bg-red-50 text-red-950",
      warning:
        "border-none bg-yellow-50 text-yellow-950",
      info:
        "border-none bg-blue-50 text-blue-950",
    },

    style: {
      width: "100vw !important",
      maxWidth: "100vw !important",
      minWidth: "100vw !important",
      borderRadius: "0 !important",
      margin: "0 !important",
      padding: "0 !important",
      left: "0 !important",
      right: "0 !important",
      bottom: "0 !important",
      transform: "none !important",
      boxShadow: "0 -6px 16px -4px rgba(0, 0, 0, 0.18)",
    },
  }}
/>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
