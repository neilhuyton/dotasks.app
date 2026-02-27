// src/app/routes/_authenticated/lists/new.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { cn } from "@/shared/lib/utils";
import { trpc, useTRPC } from "@/trpc"; // ← modern import (adjust if needed)
import { useBannerStore } from "@/shared/store/bannerStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Inferred types from tRPC router
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc"; // adjust path if needed

type RouterOutput = inferRouterOutputs<AppRouter>;
type ListItem = RouterOutput["list"]["getAll"][number];
type Lists = RouterOutput["list"]["getAll"];

function createOptimisticList(
  input: { title: string; description?: string },
  prevLength: number,
): ListItem {
  const now = new Date().toISOString();

  return {
    id: `temp-${crypto.randomUUID()}`,
    title: input.title,
    description: input.description ?? null,
    color: null,
    icon: null,
    order: prevLength,
    isPinned: false,

    // Only include what's actually in the type / response
    createdAt: now,
    updatedAt: now,

    // These two are apparently returned by your getAll (keep them)
    _count: { tasks: 0 },
    tasks: [],
  };
}

export const Route = createFileRoute("/_authenticated/lists/new")({
  loader: async ({ context: { queryClient } }) => {
    // Prefetch list.getAll so the list overview is warm when we return
    // (no input needed for getAll)
    await queryClient.ensureQueryData(
      trpc.list.getAll.queryOptions(undefined, {
        staleTime: 30_000, // optional: keep fresh for 30s
      }),
    );

    // You can return data if needed, but here we just prefetch → empty return is fine
    return {};
  },

  component: CreateListPage,
});

function CreateListPage() {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const trpc = useTRPC(); // ← typed proxy (used for queryKey/options)

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const allListsQueryKey = trpc.list.getAll.queryKey();

  const mutation = useMutation(
    trpc.list.create.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: allListsQueryKey });

        const prev = queryClient.getQueryData<Lists>(allListsQueryKey) ?? [];

        const optimistic = createOptimisticList(input, prev.length);

        queryClient.setQueryData<Lists>(allListsQueryKey, [
          optimistic,
          ...prev,
        ]);

        return { prev };
      },

      onError: (_, __, ctx) => {
        if (ctx?.prev) {
          queryClient.setQueryData(allListsQueryKey, ctx.prev);
        }
        showBanner({
          message: "Failed to create list. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: allListsQueryKey });
      },

      onSuccess: (newList) => {
        // Replace temp item with real one (nice UX polish)
        queryClient.setQueryData<Lists>(allListsQueryKey, (old = []) =>
          old.map((item) =>
            item.id.startsWith("temp-") ? { ...item, ...newList } : item,
          ),
        );

        showBanner({
          message: "List has been created successfully.",
          variant: "success",
          duration: 3000,
        });

        navigate({ to: "/lists", replace: true });
      },
    }),
  );

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
      {/* Remove or keep the debug line as needed */}
      {/* <h1>DEBUG: Create List Page is mounted</h1> */}

      <div className="relative flex min-h-full flex-col px-6 pb-20 pt-20 sm:px-8">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
          aria-label="Cancel and return to lists"
          onClick={handleCancel}
          disabled={isPending}
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
                    disabled={isPending}
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
                    disabled={isPending}
                    rows={6}
                    className="resize-none text-base"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 justify-center">
                <Button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="w-full sm:w-40"
                  data-testid="create-button"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isPending ? "Creating..." : "Create List"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="w-full sm:w-32"
                  data-testid="cancel-button"
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
