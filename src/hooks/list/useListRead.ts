import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type List = RouterOutput["list"]["getAll"][number];

export function useListRead() {
  const trpc = useTRPC();

  const listsQueryKey = trpc.list.getAll.queryKey();

  const { data: lists = [] } = useSuspenseQuery(
    trpc.list.getAll.queryOptions(undefined, {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60 * 24,
    }),
  );

  return {
    lists,
    listsQueryKey,
  };
}
