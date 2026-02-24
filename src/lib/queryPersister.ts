// src/lib/queryPersister.ts

import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import debounce from 'lodash.debounce';  // ← add this

const STORAGE_KEY = 'do-tasks:query-cache-v1';

export function createIDBPersister(): Persister {
  const debouncedSet = debounce(
    async (client: PersistedClient) => {
      await set(STORAGE_KEY, client);
    },
    2000,  // 2000 ms = throttle/debounce time
    { leading: false, trailing: true }
  );

  return {
    persistClient: async (client: PersistedClient) => {
      debouncedSet(client);
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