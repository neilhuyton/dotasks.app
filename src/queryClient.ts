// src/queryClient.ts

import { QueryClient } from "@tanstack/react-query";

let instance: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (!instance) {
    instance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          gcTime: 300_000,
          refetchOnMount: true,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          retry: 1,
          retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
          structuralSharing: false,
          notifyOnChangeProps: "all",
        },
        mutations: {
          retry: false,
        },
      },
    });
  }
  return instance;
}
