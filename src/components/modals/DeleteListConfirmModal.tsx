// src/components/modals/DeleteListConfirmModal.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DeleteListConfirmModalProps {
  isOpen: boolean;
  listId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteListConfirmModal({
  isOpen,
  listId,
  onCancel,
  onConfirm,
  isDeleting,
}: DeleteListConfirmModalProps) {
  if (!isOpen || !listId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete List?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Tasks in this list will no longer be associated with any list.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? "Deleting..." : "Delete List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}