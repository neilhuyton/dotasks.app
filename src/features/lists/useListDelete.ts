import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";

export function useListDelete() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const allListsQueryKey = trpc.list.getAll.queryKey();

  const mutation = useMutation(
    trpc.list.delete.mutationOptions({
      onMutate: async ({ id }: { id: string }) => {
        await queryClient.cancelQueries({ queryKey: allListsQueryKey });

        const previousLists = queryClient.getQueryData(allListsQueryKey) ?? [];

        queryClient.setQueryData<typeof previousLists>(
          allListsQueryKey,
          (old = []) => old.filter((l) => l.id !== id),
        );

        return { previousLists };
      },

      onError: (_, __, context) => {
        if (context?.previousLists) {
          queryClient.setQueryData(allListsQueryKey, context.previousLists);
        }

        showBanner({
          message: "Failed to delete list. Please try again.",
          variant: "error",
          duration: 5000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: allListsQueryKey });
        // Do NOT invalidate or remove the single list query here
        // It would cause data: undefined on this page during pending/error
      },

      onSuccess: () => {
        showBanner({
          message: "List deleted successfully.",
          variant: "success",
          duration: 3000,
        });
      },
    }),
  );

  return {
    deleteList: (
      listId: string,
      callbacks?: {
        onSuccess?: () => void;
        onError?: () => void;
      },
    ) => {
      mutation.mutate(
        { id: listId },
        {
          onSuccess: () => callbacks?.onSuccess?.(),
          onError: () => callbacks?.onError?.(),
        },
      );
    },

    isDeleting: mutation.isPending,
  };
}
