// src/routes/_authenticated/lists/$listId/delete.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { trpc } from "@/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lists/$listId/delete")({
  component: DeleteListConfirmPage,
});

function DeleteListConfirmPage() {
  const { listId } = Route.useParams();

  const navigate = Route.useNavigate();
  const utils = trpc.useUtils();

  const { data: list, isLoading: isListLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Optional: keep showing previous data while refetching
      placeholderData: (prev) => prev,
    },
  );

  const mutation = trpc.list.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.list.getAll.cancel();
      const previousLists = utils.list.getAll.getData() ?? [];
      utils.list.getAll.setData(undefined, (old = []) =>
        old.filter((l) => l.id !== id),
      );
      return { previousLists };
    },

    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        utils.list.getAll.setData(undefined, context.previousLists);
      }
      toast.error("Failed to delete list");
      console.error("Failed to delete list:", err);
    },

    onSettled: () => {
      utils.list.getAll.invalidate();
    },

    onSuccess: () => {
      toast.success("List deleted successfully");
      navigate({ to: "/lists", replace: true });
    },
  });

  const handleCancel = () => {
    navigate({ to: "/lists", replace: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ id: listId });
  };

  // Use cached/fallback title
  const listTitle = list?.title ?? "this list";

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
      <div className="relative flex min-h-full flex-col px-6 pb-20 pt-20">
        {/* Back button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 z-[10000]"
          aria-label="Back to lists"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Centered content */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="space-y-6 max-w-md">
            {isListLoading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">
                  Loading list...
                </h1>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">
                  Delete "{listTitle}"?
                </h1>

                <p className="text-lg text-muted-foreground">
                  This action cannot be undone. All tasks in this list will be
                  permanently deleted.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <form
          onSubmit={handleSubmit}
          aria-label="Delete list confirmation"
          className="mt-auto flex flex-col gap-4 sm:flex-row sm:justify-center w-full max-w-sm mx-auto pb-10"
        >
          <Button
            type="submit"
            variant="destructive"
            disabled={mutation.isPending || isListLoading || !list}
            className="w-full sm:w-40"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            )}
            {mutation.isPending ? "Deleting..." : "Delete List"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={mutation.isPending || isListLoading}
            className="w-full sm:w-32"
          >
            Cancel
          </Button>
        </form>
      </div>
    </div>
  );
}
