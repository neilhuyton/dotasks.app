import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";

let queryClientInstance: QueryClient | undefined;

const createQueryClient = () => {
  if (queryClientInstance) {
    return queryClientInstance;
  }

  queryClientInstance = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 1,
        gcTime: 5 * 60 * 1000,
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

    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
  });

  return queryClientInstance;
};

export function getQueryClient(): QueryClient {
  return createQueryClient();
}