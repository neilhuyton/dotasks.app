// src/lib/queryPersister.ts

import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const STORAGE_KEY = 'my-app-query-cache'; // Change to something unique per app

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(STORAGE_KEY, client);
    },

    restoreClient: async () => {
      const data = await get<PersistedClient>(STORAGE_KEY);
      return data ?? undefined;
    },

    removeClient: async () => {
      await del(STORAGE_KEY);
    },
  };
}