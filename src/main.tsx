// src/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router/router";
import { trpcClient } from "@/client";
import { trpc } from "@/trpc";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { get, set, del } from "idb-keyval";
import {
  type Persister,
  type PersistedClient,
  PersistQueryClientProvider,
} from "@tanstack/react-query-persist-client";
import { ToasterWrapper } from "./components/ToasterWrapper";
import { queryClient } from "@/queryClient";
import { RealtimeListeners } from "@/components/RealtimeListeners";

const CACHE_KEY = "my-app-query-cache-v4";

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
          <ToasterWrapper />
          <RealtimeListeners />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
