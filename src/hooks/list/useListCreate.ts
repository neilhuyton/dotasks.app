import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type List = RouterOutput["list"]["getAll"][number];

function createOptimisticList(
  input: { title: string; description?: string },
  prevLength: number,
): List {
  const now = new Date().toISOString();
  return {
    id: `temp-${crypto.randomUUID()}`,
    title: input.title,
    description: input.description ?? null,
    color: null,
    icon: null,
    order: prevLength,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
    _count: { tasks: 0 },
    tasks: [],
  };
}

export function useListCreate() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const allListsQueryKey = trpc.list.getAll.queryKey();

  const mutation = useMutation(
    trpc.list.create.mutationOptions({
      onMutate: async (input: { title: string; description?: string }) => {
        await queryClient.cancelQueries({ queryKey: allListsQueryKey });

        const prev = queryClient.getQueryData<List[]>(allListsQueryKey) ?? [];

        const optimistic = createOptimisticList(input, prev.length);

        queryClient.setQueryData<List[]>(allListsQueryKey, [
          ...prev,
          optimistic,
        ]);

        return { prev };
      },

      onError: (_, __, ctx) => {
        if (ctx?.prev) {
          queryClient.setQueryData(allListsQueryKey, ctx.prev);
        }
        showBanner({
          message: "Failed to create list. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: allListsQueryKey });
      },

      onSuccess: (created) => {
        queryClient.setQueryData<List[]>(allListsQueryKey, (old = []) =>
          old.map((item) =>
            item.id.startsWith("temp-")
              ? {
                  ...item,
                  id: created.id,
                  title: created.title,
                  description: created.description,
                  color: created.color,
                  icon: created.icon,
                  order: created.order,
                  isPinned: created.isPinned,
                  createdAt: created.createdAt,
                  updatedAt: created.updatedAt,
                }
              : item,
          ),
        );

        showBanner({
          message: "List has been created successfully.",
          variant: "success",
          duration: 3000,
        });
      },
    }),
  );

  return {
    createList: (
      input: { title: string; description?: string },
      callbacks?: {
        onSuccess?: () => void;
      },
    ) => {
      mutation.mutate(input, {
        onSuccess: () => callbacks?.onSuccess?.(),
      });
    },

    isCreating: mutation.isPending,
  };
}