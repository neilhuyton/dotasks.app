// src/routes/_authenticated/lists/new.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";
import { useBannerStore } from "@/store/bannerStore";

export const Route = createFileRoute("/_authenticated/lists/new")({
  component: CreateListPage,
});

function CreateListPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const navigate = Route.useNavigate();
  const { userId } = useAuthStore();
  const utils = trpc.useUtils();
  const { show: showBanner } = useBannerStore();

  const mutation = trpc.list.create.useMutation({
    onMutate: async (input) => {
      await utils.list.getAll.cancel();
      const prev = utils.list.getAll.getData() ?? [];

      const optimistic = {
        id: `temp-${crypto.randomUUID()}`,
        title: input.title,
        description: input.description ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
        userId: userId ?? "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
        _count: { tasks: 0 },
        isPinned: false,
        tasks: [],
      };

      utils.list.getAll.setData(undefined, [optimistic, ...prev]);

      return { prev };
    },

    onError: (_, __, ctx) => {
      if (ctx?.prev) utils.list.getAll.setData(undefined, ctx.prev);
    },

    onSuccess: (newList) => {
      utils.list.getAll.setData(undefined, (old = []) =>
        old.map((l) => (l.id.startsWith("temp-") ? { ...l, ...newList } : l)),
      );

      showBanner({
        message: `List has been created successfully.`,
        variant: "success",
        duration: 3000,
      });

      navigate({ to: "/lists", replace: true });
    },
  });

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    mutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleCancel = () => {
    navigate({ to: "/lists", replace: true });
  };

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
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Create New List
              </h1>
            </div>

            <form
              data-testid="create-list-form"
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
                    disabled={mutation.isPending}
                    autoComplete="off"
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
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 justify-center">
                <Button
                  type="submit"
                  disabled={mutation.isPending || !title.trim()}
                  className="w-full sm:w-40"
                >
                  {mutation.isPending && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {mutation.isPending ? "Creating..." : "Create List"}
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
