import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";

export function useListUpdate() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const mutation = useMutation(
    trpc.list.update.mutationOptions({
      onMutate: async (input) => {
        const listQueryKey = trpc.list.getOne.queryKey({ id: input.id });
        const allQueryKey = trpc.list.getAll.queryKey();

        await queryClient.cancelQueries({ queryKey: listQueryKey });
        await queryClient.cancelQueries({ queryKey: allQueryKey });

        const prevDetail = queryClient.getQueryData(listQueryKey);
        const prevAll = queryClient.getQueryData(allQueryKey);

        if (prevDetail) {
          queryClient.setQueryData(listQueryKey, (old) => ({
            ...old!,
            ...input,
            updatedAt: new Date().toISOString(),
          }));
        }

        queryClient.setQueryData(allQueryKey, (old = []) =>
          old.map((l) =>
            l.id === input.id
              ? { ...l, ...input, updatedAt: new Date().toISOString() }
              : l,
          ),
        );

        return { prevDetail, prevAll };
      },

      onError: (_, __, context) => {
        if (context?.prevDetail) {
          queryClient.setQueryData(
            trpc.list.getOne.queryKey({ id: context.prevDetail.id }),
            context.prevDetail,
          );
        }

        if (context?.prevAll) {
          queryClient.setQueryData(
            trpc.list.getAll.queryKey(),
            context.prevAll,
          );
        }

        showBanner({
          message: "Failed to update list. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSuccess: () => {
        showBanner({
          message: "List updated successfully.",
          variant: "success",
          duration: 3000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.list.getOne.queryKey({ id: "" }), // partial match ok, or use exact if needed
        });
        queryClient.invalidateQueries({
          queryKey: trpc.list.getAll.queryKey(),
        });
      },
    }),
  );

  return {
    updateList: (
      input: { id: string; title: string; description?: string },
      callbacks?: {
        onSuccess?: () => void;
      },
    ) => {
      mutation.mutate(input, {
        onSuccess: () => {
          callbacks?.onSuccess?.();
        },
      });
    },

    isUpdating: mutation.isPending,
  };
}