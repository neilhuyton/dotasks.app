// src/components/modals/DeleteListConfirmModal.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "radix-ui";
import { trpc } from "@/trpc";
import { useNavigate } from "@tanstack/react-router";

interface DeleteListConfirmModalProps {
  isOpen: boolean;
  listId: string;
}

export default function DeleteListConfirmModal({
  isOpen,
  listId,
}: DeleteListConfirmModalProps) {
  const navigate = useNavigate();
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
      // TODO: toast.error("Could not delete list")
    },
    onSettled: () => {
      utils.list.getAll.invalidate();
    },
    onSuccess: () => {
      navigate({ to: "/lists", replace: true });
    },
  });

  if (!isOpen || !listId) return null;

  const handleClose = () => {
    navigate({
      to: "/lists",
      replace: true,
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-0 z-50",
          "h-[100dvh] w-[100dvw] max-h-none max-w-none",
          "m-0 p-0 left-0 top-0 translate-x-0 translate-y-0",
          "rounded-none border-0 shadow-none",
          "bg-background",
          "overscroll-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "sm:max-w-none",
        )}
      >
        <div className="relative flex min-h-full flex-col px-6 pb-12 pt-20">
          {/* Close button */}
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

          {/* Main content – takes available space and centers vertically */}
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <DialogHeader className="space-y-4 mb-10">
              <DialogTitle className="text-3xl font-bold">
                Delete List?
              </DialogTitle>

              <VisuallyHidden.Root>
                <DialogDescription>
                  Confirmation dialog to delete the selected list. This action
                  is permanent and will disassociate all tasks from this list.
                </DialogDescription>
              </VisuallyHidden.Root>

              <DialogDescription className="text-lg text-muted-foreground max-w-md">
                This action cannot be undone. Tasks in this list will no longer
                be associated with any list.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Footer – pinned to bottom with safe padding */}
          <DialogFooter className="mt-auto flex-col gap-4 sm:flex-row sm:justify-center w-full max-w-sm mx-auto pb-8 sm:pb-10">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="w-full sm:w-32"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate({ id: listId })}
              disabled={mutation.isPending}
              className="w-full sm:w-40"
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              )}
              {mutation.isPending ? "Deleting..." : "Delete List"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
