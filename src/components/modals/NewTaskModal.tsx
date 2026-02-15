// src/components/modals/NewTaskModal.tsx

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "radix-ui";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
  isPending: boolean;
  listId: string;
}

export default function NewTaskModal({
  isOpen,
  onClose,
  onCreate,
  isPending,
}: NewTaskModalProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim());
    setTitle("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
        <div className="flex h-full flex-col">
          <header className="relative px-6 pt-16 pb-8 shrink-0">
            <DialogClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-6 z-10"
                aria-label="Close"
              >
                <X className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DialogClose>

            <DialogTitle className="text-3xl font-bold tracking-tight text-center">
              New Task
            </DialogTitle>

            <VisuallyHidden.Root>
              <DialogDescription>
                Form to create a new task in the current list.
              </DialogDescription>
            </VisuallyHidden.Root>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-lg">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label htmlFor="task-title" className="text-base font-medium block">
                    What needs to be done?
                  </label>
                  <Input
                    id="task-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title..."
                    autoFocus
                    required
                    disabled={isPending}
                    className="h-14 text-lg"
                  />
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-4 pt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || !title.trim()}
                    className="w-full sm:w-auto"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}