// src/app/components/PersistedQueryClientProvider.tsx

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { PropsWithChildren } from "react";

import { getQueryClient } from "@/queryClient"; // ← Changed to the getter function
import { createIDBPersister } from "@/lib/queryPersister";

const persister = createIDBPersister();

export function PersistedQueryClientProvider({ children }: PropsWithChildren) {
  return (
    <PersistQueryClientProvider
      client={getQueryClient()}
      persistOptions={{
        persister,
      }}
      onSuccess={() => {
        getQueryClient().resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
