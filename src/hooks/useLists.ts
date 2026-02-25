// src/hooks/useLists.ts

import { useState } from "react";
import { trpc } from "@/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { useBannerStore } from "@/store/bannerStore";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type List = RouterOutput["list"]["getAll"][number];

export function useLists() {
  const utils = trpc.useUtils();
  const { show: showBanner } = useBannerStore();

  const {
    data: lists = [],
    isLoading,
    isFetching,
  } = trpc.list.getAll.useQuery(undefined, {
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 24,
    placeholderData: keepPreviousData,
  });

  const [pendingReorder, setPendingReorder] = useState<List[] | null>(null);
  const displayedLists = pendingReorder ?? lists;

  const reorderMutation = trpc.list.reorder.useMutation({
    onMutate: async (updates: { id: string; order: number }[]) => {
      await utils.list.getAll.cancel();
      const previous = utils.list.getAll.getData() ?? [];

      const newLists = previous.map((list) => {
        const update = updates.find((u) => u.id === list.id);
        return update ? { ...list, order: update.order } : list;
      });

      newLists.sort((a, b) => a.order - b.order);

      setPendingReorder(newLists);
      utils.list.getAll.setData(undefined, newLists);

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
      utils.list.getAll.setData(undefined, context?.previous);
      showBanner({
        message: "Failed to reorder lists",
        variant: "error",
        duration: 4000,
      });
    },

    onSettled: () => {
      setPendingReorder(null);
      utils.list.getAll.invalidate();
    },
  });

  return {
    lists: displayedLists,
    isLoadingLists: isLoading || (isFetching && displayedLists.length === 0),
    updateListOrder: reorderMutation.mutate,
    isReordering: reorderMutation.isPending,
  };
}
