// src/routes/_authenticated/lists/$listId/delete.tsx

import { createFileRoute } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { trpc } from "@/trpc";
import { VisuallyHidden } from "radix-ui"; // assuming @radix-ui/react-visually-hidden
import { cn } from "@/lib/utils";

export const Route = createFileRoute('/_authenticated/lists/$listId/delete')({
  component: DeleteListConfirmModalRoute,
})

function DeleteListConfirmModalRoute() {
  const { listId } = Route.useParams()  // type-safe from parent dynamic route

  // Optional: fetch title if not passed via search/state (but since you have it optional, we can query or skip)
  const { data: list } = trpc.list.getOne.useQuery(
    { id: listId },
    { staleTime: 1000 * 60 * 5 }, // reuse cache if detail page already fetched
  );

  const navigate = Route.useNavigate();
  const utils = trpc.useUtils();

  const mutation = trpc.list.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.list.getAll.cancel();
      const previousLists = utils.list.getAll.getData();
      utils.list.getAll.setData(undefined, (old = []) =>
        old.filter((list) => list.id !== id),
      );
      return { previousLists };
    },
    onError: (err, _newList, context) => {
      if (context?.previousLists) {
        utils.list.getAll.setData(undefined, context.previousLists);
      }
      console.error("Failed to delete list:", err);
      // TODO: add toast.error here if you have a toast system
    },
    onSettled: () => {
      utils.list.getAll.invalidate();
    },
    onSuccess: () => {
      navigate({ to: "/lists", replace: true });  // back to lists overview
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ id: listId });
  };

  const handleClose = () => {
    navigate({ to: "/lists", replace: true });  // relative: back to parent /lists/$listId
    // Alternative: { to: "/lists/$listId", params: { listId }, replace: true }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-0 z-50 h-[100dvh] w-[100dvw] max-h-none max-w-none",
          "m-0 p-0 left-0 top-0 translate-x-0 translate-y-0",
          "rounded-none border-0 shadow-none bg-background overscroll-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "sm:max-w-none"
        )}
      >
        <div className="relative flex min-h-full flex-col px-6 pb-12 pt-20">
          <DialogClose asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-6 z-10"
              aria-label="Close"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex flex-col gap-2 text-center sm:text-left space-y-4 mb-10">
              <DialogTitle className="text-3xl font-bold">
                Delete List{list?.title ? ` "${list.title}"` : "?"}
              </DialogTitle>

              <VisuallyHidden.Root>
                <DialogDescription>
                  Confirmation dialog to delete the selected list. This action is
                  permanent and will disassociate all tasks from this list.
                </DialogDescription>
              </VisuallyHidden.Root>

              <p className="text-lg text-muted-foreground max-w-md">
                This action cannot be undone. Tasks in this list will no longer
                be associated with any list.
              </p>
            </div>
          </div>

          <form
            data-testid="delete-list-form"
            onSubmit={handleSubmit}
            className="mt-auto flex flex-col gap-4 sm:flex-row sm:justify-center w-full max-w-sm mx-auto pb-8 sm:pb-10"
          >
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="w-full sm:w-32"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="destructive"
              disabled={mutation.isPending}
              className="w-full sm:w-40"
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mutation.isPending ? "Deleting..." : "Delete List"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}