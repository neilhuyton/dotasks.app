import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type Task = inferRouterOutputs<AppRouter>["task"]["getByList"][number];

export function useTaskDelete(listId: string | null | undefined) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const queryKey = listId
    ? trpc.task.getByList.queryKey({ listId })
    : ["task", "getByList", { listId: null }];

  const listOneQueryKey = listId
    ? trpc.list.getOne.queryKey({ id: listId })
    : ["list", "getOne", { id: null }];

  const listAllQueryKey = trpc.list.getAll.queryKey();

  const mutation = useMutation(
    trpc.task.delete.mutationOptions({
      onMutate: async ({ id }: { id: string }) => {
        if (!listId) return { previous: [] as Task[] };

        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        queryClient.setQueryData(queryKey, (old: Task[] = []) =>
          old.filter((t) => t.id !== id),
        );

        return { previous };
      },

      onError: (_, __, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(queryKey, ctx.previous);
        }
        showBanner({
          message: "Failed to delete task",
          variant: "error",
          duration: 4000,
        });
      },

      onSuccess: () => {
        showBanner({
          message: "Task deleted",
          variant: "success",
          duration: 3000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({
          queryKey: listOneQueryKey,
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: listAllQueryKey,
          exact: true,
        });
      },
    }),
  );

  const deleteTask = (id: string, options?: { onSuccess?: () => void }) => {
    if (!listId) return;
    mutation.mutate(
      { id },
      {
        onSuccess: () => options?.onSuccess?.(),
      },
    );
  };

  return {
    deleteTask,
    isDeleting: mutation.isPending,
  };
}
