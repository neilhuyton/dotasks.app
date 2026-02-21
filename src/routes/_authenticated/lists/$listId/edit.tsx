// src/routes/_authenticated/lists/$listId/edit.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X } from "lucide-react";
import { useState, useEffect, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";

export const Route = createFileRoute("/_authenticated/lists/$listId/edit")({
  component: EditListPage,
});

function EditListPage() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();
  const utils = trpc.useUtils();

  const {
    data: list,
    isLoading,
    isError,
  } = trpc.list.getOne.useQuery({ id: listId }, { enabled: !!listId });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Initialize form values once list data is loaded
  useEffect(() => {
    if (list) {
      setTitle(list.title || "");
      setDescription(list.description ?? "");
    }
  }, [list]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !list) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold">List not found</h1>
        <Button onClick={() => navigate({ to: "/lists", replace: true })}>
          Back to Lists
        </Button>
      </div>
    );
  }

  const mutation = trpc.list.update.useMutation({
    onMutate: async (input) => {
      await utils.list.getAll.cancel();

      const prevAll = utils.list.getAll.getData() ?? [];

      utils.list.getAll.setData(undefined, (old = []) =>
        old.map((l) =>
          l.id === input.id
            ? { ...l, ...input, updatedAt: new Date().toISOString() }
            : l,
        ),
      );

      const prevDetail = utils.list.getOne.getData({ id: listId });
      if (prevDetail) {
        utils.list.getOne.setData({ id: listId }, { ...prevDetail, ...input });
      }

      return { prevAll, prevDetail };
    },

    onError: (_, __, ctx) => {
      if (ctx?.prevAll) utils.list.getAll.setData(undefined, ctx.prevAll);
      if (ctx?.prevDetail)
        utils.list.getOne.setData({ id: listId }, ctx.prevDetail);
      console.error("Failed to update list", ctx);
    },

    onSuccess: (updatedList) => {
      utils.list.getAll.setData(undefined, (old = []) =>
        old.map((l) => (l.id === updatedList.id ? updatedList : l)),
      );
      utils.list.getOne.setData({ id: listId }, updatedList);

      navigate({ to: "/lists", replace: true });
    },
  });

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    mutation.mutate({
      id: listId,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleCancel = () => {
    navigate({ to: "/lists", replace: true });
  };

  const isPending = mutation.isPending;

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
      <div className="relative flex min-h-full flex-col px-6 pb-20 pt-20 sm:px-8">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
          aria-label="Cancel and return to lists"
          onClick={handleCancel}
          disabled={isPending}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Edit List
              </h1>
            </div>

            <form
              data-testid="edit-list-form"
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="list-title"
                    className="text-sm font-medium block"
                  >
                    List name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="list-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Work, Groceries, Ideas..."
                    autoFocus
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="list-desc"
                    className="text-sm font-medium block"
                  >
                    Description (optional)
                  </label>
                  {/* Removed resize-none text-base → now matches login-like textarea */}
                  <Textarea
                    id="list-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any notes about this list..."
                    disabled={isPending}
                    rows={6}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 justify-center">
                <Button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="w-full sm:w-40"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
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
