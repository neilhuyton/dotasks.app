// src/app/routes/_authenticated/lists/$listId/delete.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/app/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc, useTRPC } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RouteError } from "@/app/components/RouteError";

export const Route = createFileRoute("/_authenticated/lists/$listId/delete")({
  loader: async ({ context: { queryClient }, params }) => {
    const { listId } = params;

    if (!listId) return {};

    await queryClient.ensureQueryData(
      trpc.list.getOne.queryOptions(
        { id: listId },
        { staleTime: 5 * 60 * 1000 },
      ),
    );

    return {};
  },

  pendingComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  ),
  pendingMs: 0,
  pendingMinMs: 300,

  errorComponent: ({ error, reset }) => (
    <RouteError
      error={error}
      reset={reset}
      title="Failed to load list for deletion"
      backTo="/lists"
      backLabel="Back to Lists"
    />
  ),

  component: DeleteListConfirmPage,
});

function DeleteListConfirmPage() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { show: showBanner } = useBannerStore();
  const queryClient = useQueryClient();
  const trpcHook = useTRPC();

  const listQueryInput = { id: listId ?? "" };
  const allListsQueryKey = trpcHook.list.getAll.queryKey();

  const { data: list, isPending: isListPending } = useQuery(
    trpcHook.list.getOne.queryOptions(listQueryInput, {
      staleTime: 5 * 60 * 1000,
      enabled: !!listId,
    }),
  );

  const deleteMutation = useMutation(
    trpcHook.list.delete.mutationOptions({
      onMutate: async ({ id }) => {
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
      },

      onSuccess: () => {
        showBanner({
          message: "List deleted successfully.",
          variant: "success",
          duration: 3000,
        });

        navigate({ to: "/lists", replace: true });
      },
    }),
  );

  const handleCancel = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  const isPending = deleteMutation.isPending;
  const listTitle = list?.title ?? "this list";

  if (!listId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        No list ID provided.
      </div>
    );
  }

  if (isListPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        List not found or you don't have access.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] isolate pointer-events-auto",
        "h-dvh w-dvw max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0",
        "rounded-none border-0 shadow-none",
        "bg-background overscroll-none touch-none",
      )}
    >
      <div className="relative flex min-h-full flex-col px-6 pt-20 pb-10 sm:px-8">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
          aria-label="Cancel and return to list"
          onClick={handleCancel}
          disabled={isPending}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Delete "{listTitle}"?
              </h1>
              <p className="text-lg text-muted-foreground">
                This action cannot be undone. All tasks in this list will also
                be permanently deleted.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                deleteMutation.mutate({ id: listId });
              }}
              className="space-y-8"
              data-testid="delete-confirm-form"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isPending}
                  className="w-full sm:w-44"
                  data-testid="delete-confirm-button"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isPending ? "Deleting..." : "Delete List"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="w-full sm:w-32"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
