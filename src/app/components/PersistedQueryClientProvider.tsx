// src/app/components/PersistedQueryClientProvider.tsx

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { PropsWithChildren } from "react";

import { queryClient } from "@/queryClient";
import { createIDBPersister } from "@/lib/queryPersister";

const persister = createIDBPersister();

export function PersistedQueryClientProvider({ children }: PropsWithChildren) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
      }}
      onSuccess={() => {
        queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
