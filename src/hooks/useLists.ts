// src/hooks/useLists.ts

import { useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from '@steel-cut/steel-lib'
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type List = RouterOutput["list"]["getAll"][number];

export function useLists() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const listsQueryKey = trpc.list.getAll.queryKey();

  const { data: lists = [] } = useSuspenseQuery(
    trpc.list.getAll.queryOptions(undefined, {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60 * 24,
    }),
  );

  const [pendingReorder, setPendingReorder] = useState<List[] | null>(null);
  const displayedLists = pendingReorder ?? lists;

  const reorderMutation = useMutation(
    trpc.list.reorder.mutationOptions({
      onMutate: async (updates: { id: string; order: number }[]) => {
        await queryClient.cancelQueries({ queryKey: listsQueryKey });

        const previous = queryClient.getQueryData<List[]>(listsQueryKey) ?? [];

        const newLists = previous.map((list) => {
          const update = updates.find((u) => u.id === list.id);
          return update ? { ...list, order: update.order } : list;
        });

        newLists.sort((a, b) => a.order - b.order);

        setPendingReorder(newLists);
        queryClient.setQueryData(listsQueryKey, newLists);

        return { previous };
      },

      onSuccess: () => {
        showBanner({
          message: "Lists reordered",
          variant: "success",
          duration: 2000,
        });
      },

      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(listsQueryKey, context.previous);
        }
        showBanner({
          message: "Failed to reorder lists",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        setPendingReorder(null);
        queryClient.invalidateQueries({ queryKey: listsQueryKey });
      },
    }),
  );

  return {
    lists: displayedLists,
    updateListOrder: reorderMutation.mutate,
    isReordering: reorderMutation.isPending,
  };
}
