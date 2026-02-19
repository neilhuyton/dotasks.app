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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "radix-ui";
import { trpc } from "@/trpc";
import { useNavigate, useParams } from "@tanstack/react-router";

interface EditListModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialData: {
    id: string;
    title: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
  };
}

export default function EditListModal({
  isOpen = true,
  onClose,
  initialData,
}: EditListModalProps) {
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description ?? "");

  const navigate = useNavigate();
  const { listId } = useParams({ from: "/_authenticated/lists/$listId/edit" }); // optional if using params
  const utils = trpc.useUtils();

  const mutation = trpc.list.update.useMutation({
    onMutate: async (input) => {
      await utils.list.getAll.cancel();
      const prev = utils.list.getAll.getData() ?? [];

      // Optimistic update in list of lists
      utils.list.getAll.setData(undefined, (old = []) =>
        old.map((l) => (l.id === input.id ? { ...l, ...input } : l)),
      );

      // If on detail page, also update getOne
      if (listId === input.id) {
        utils.list.getOne.setData({ id: input.id }, (old) =>
          old ? { ...old, ...input } : old,
        );
      }

      return { prev };
    },

    onError: (_, __, ctx) => {
      if (ctx?.prev) utils.list.getAll.setData(undefined, ctx.prev);
    },

    onSuccess: () => {
      utils.list.getAll.invalidate();
      utils.list.getOne.invalidate({ id: initialData.id });

      if (onClose) onClose();
      else navigate({ to: "/lists", replace: true });
    },
  });

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    mutation.mutate({
      id: initialData.id,
      title: title.trim(),
      description: description.trim() || undefined,
      // color: ..., icon: ... (add if you have UI for them)
    });
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate({ to: "/lists", replace: true });
  };

  if (!isOpen) return null;

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
          "sm:max-w-none md:max-w-none lg:max-w-none",
        )}
      >
        <div className="flex h-full flex-col">
          <header className="relative px-4 sm:px-6 pt-16 pb-6 shrink-0">
            <DialogClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-6 sm:left-6 sm:top-8 z-10"
                aria-label="Close"
                onClick={handleClose}
              >
                <X className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DialogClose>

            <DialogTitle className="text-3xl font-bold tracking-tight text-center">
              Edit List
            </DialogTitle>

            <VisuallyHidden.Root>
              <DialogDescription>
                Edit the name and description of your list.
              </DialogDescription>
            </VisuallyHidden.Root>
          </header>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
            <form
              onSubmit={handleSubmit}
              className="mx-auto max-w-2xl space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="list-title"
                    className="text-sm font-medium block"
                  >
                    List name
                  </label>
                  <Input
                    id="list-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Work, Groceries, Ideas..."
                    autoFocus
                    required
                    disabled={mutation.isPending}
                    className="h-12 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="list-desc"
                    className="text-sm font-medium block"
                  >
                    Description (optional)
                  </label>
                  <Textarea
                    id="list-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any notes about this list..."
                    disabled={mutation.isPending}
                    rows={6}
                    className="resize-none text-base"
                  />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={mutation.isPending}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={mutation.isPending || !title.trim()}
                  className="w-full sm:w-auto"
                >
                  {mutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
