// src/components/GoalHistoryDialog.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import GoalList from "@/components/GoalList";

interface GoalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GoalHistoryDialog({
  open,
  onOpenChange,
}: GoalHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Goal History</DialogTitle>
          <DialogDescription className="text-sm">
            Most recent goals first
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <GoalList />
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
