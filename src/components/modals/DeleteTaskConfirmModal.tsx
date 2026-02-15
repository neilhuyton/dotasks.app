// src/components/modals/DeleteTaskConfirmModal.tsx

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

interface DeleteTaskConfirmModalProps {
  isOpen: boolean;
  taskId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteTaskConfirmModal({
  isOpen,
  taskId,
  onCancel,
  onConfirm,
  isDeleting,
}: DeleteTaskConfirmModalProps) {
  if (!isOpen || !taskId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
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
          "sm:max-w-none"
        )}
      >
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <DialogClose asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-6 z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>

          <DialogHeader className="space-y-4 mb-10">
            <DialogTitle className="text-3xl font-bold">Delete Task?</DialogTitle>

            <VisuallyHidden.Root>
              <DialogDescription>
                Confirmation dialog to permanently delete the selected task.
              </DialogDescription>
            </VisuallyHidden.Root>

            <DialogDescription className="text-lg text-muted-foreground max-w-md">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-4 w-full max-w-sm">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isDeleting}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              className="w-full"
            >
              {isDeleting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}