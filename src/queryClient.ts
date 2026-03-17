import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { isTRPCClientError } from "@trpc/client";

let queryClient: QueryClient | undefined;

function is401Error(error: unknown): boolean {
  if (!isTRPCClientError(error)) return false;
  const data = error.data as { code?: string; httpStatus?: number } | undefined;
  return (
    data?.code === "UNAUTHORIZED" ||
    error.message.includes("UNAUTHORIZED") ||
    data?.httpStatus === 401
  );
}

export function getQueryClient(): QueryClient {
  if (queryClient) return queryClient;

  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 1,
        gcTime: 5 * 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: false,
        retry: (failureCount, error) => {
          if (is401Error(error)) return false;
          return failureCount < 3;
        },
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

  return queryClient;
}
