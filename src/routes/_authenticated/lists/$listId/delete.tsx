// src/routes/_authenticated/lists/$listId/delete.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { trpc } from "@/trpc";
import { cn } from "@/lib/utils";
import { useBannerStore } from "@/store/bannerStore";

export const Route = createFileRoute("/_authenticated/lists/$listId/delete")({
  component: DeleteListConfirmPage,
});

function DeleteListConfirmPage() {
  const { listId } = Route.useParams();

  const navigate = Route.useNavigate();
  const utils = trpc.useUtils();
  const { show: showBanner } = useBannerStore();

  const { data: list, isLoading: isListLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
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
      showBanner({
        message: "Failed to delete list. Please try again.",
        variant: "error",
        duration: 4000,
      });
      console.error("Failed to delete list:", err);
    },

    onSettled: () => {
      utils.list.getAll.invalidate();
    },

    onSuccess: () => {
      showBanner({
        message: `List has been deleted successfully.`,
        variant: "success",
        duration: 3000,
      });
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

  const listTitle = list?.title ?? "this list";

  if (isListLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
        {/* Back / Close button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
          aria-label="Back to lists"
          onClick={handleCancel}
          disabled={mutation.isPending}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Main centered content */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Delete "{listTitle}"?
              </h1>
              <p className="text-lg text-muted-foreground">
                This action cannot be undone. All tasks in this list will be
                permanently deleted.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              aria-label="Delete list confirmation"
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={mutation.isPending}
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
                  disabled={mutation.isPending}
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
