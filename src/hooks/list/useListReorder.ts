// src/hooks/list/useListReorder.ts
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type List = inferRouterOutputs<AppRouter>["list"]["getAll"][number];

export function useListReorder() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const listsQueryKey = trpc.list.getAll.queryKey();

  const [pendingReorder, setPendingReorder] = useState<List[] | null>(null);

  const mutation = useMutation(
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

  const updateListOrder = mutation.mutate;

  const isReordering = mutation.isPending;

  return {
    pendingReorder,
    updateListOrder,
    isReordering,
  };
}
