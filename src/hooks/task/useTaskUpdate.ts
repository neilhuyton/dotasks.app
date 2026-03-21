import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";

export function useTaskUpdate(listId: string | null | undefined) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const queryInput = { listId: listId ?? "" };
  const queryKey = trpc.task.getByList.queryKey(queryInput);

  const mutation = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (variables: {
        id: string;
        title?: string;
        description?: string | null;
      }) => {
        await queryClient.cancelQueries({ queryKey });

        const previousTasks = queryClient.getQueryData(queryKey) ?? [];

        queryClient.setQueryData(queryKey, (old = []) =>
          old.map((t) =>
            t.id === variables.id
              ? {
                  ...t,
                  title: variables.title ?? t.title,
                  description: variables.description ?? t.description ?? null,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );

        return { previousTasks };
      },

      onError: (_, __, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData(queryKey, context.previousTasks);
        }

        showBanner({
          message: "Failed to update task. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },

      onSuccess: () => {
        showBanner({
          message: "Task updated successfully.",
          variant: "success",
          duration: 3000,
        });
      },
    }),
  );

  return {
    updateTask: (
      input: { id: string; title: string; description?: string },
      callbacks?: { onSuccess?: () => void },
    ) => {
      mutation.mutate(
        {
          id: input.id,
          title: input.title,
          description: input.description || undefined,
        },
        { onSuccess: () => callbacks?.onSuccess?.() },
      );
    },

    isUpdating: mutation.isPending,
  };
}
