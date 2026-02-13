// src/components/GoalHistoryDialog.tsx

import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import GoalList from "@/components/GoalList";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-0 z-50",
          "h-[100dvh] w-[100dvw] max-h-none max-w-none",
          "m-0 p-0 left-0 top-0 translate-x-0 translate-y-0",
          "rounded-none border-0 shadow-none",
          "bg-background",
          "overscroll-none",
          "sm:max-w-none md:max-w-none lg:max-w-none",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header – matched to main page & WeightHistoryDialog */}
          <header className="relative px-4 sm:px-6 pt-22 pb-6 shrink-0">
            {/* Custom close button – top-left, styled like ThemeToggle */}
            <DialogClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-6 sm:left-6 sm:top-8 z-10"
                aria-label="Close goal history"
              >
                <X className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DialogClose>

            {/* Hidden for accessibility */}
            <h1 className="sr-only">Goal History</h1>

            <div className="mx-auto max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-center">
                Goal History
              </h1>
            </div>
          </header>

          {/* Main scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-3xl">
              <GoalList />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
