// src/app/routes/_authenticated/lists/$listId/edit.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Zod schema
const editListSchema = z.object({
  title: z.string().min(1, "List name is required").trim(),
  description: z.string().trim().optional(),
});

type EditListFormData = z.infer<typeof editListSchema>;

export const Route = createFileRoute("/_authenticated/lists/$listId/edit")({
  loader: async ({ context: { queryClient }, params }) => {
    const { listId } = params;
    if (!listId) return {};

    await queryClient.ensureQueryData(
      trpc.list.getOne.queryOptions(
        { id: listId },
        { staleTime: 5 * 60 * 1000 },
      ),
    );

    return {};
  },

  pendingComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  ),
  pendingMs: 0,
  pendingMinMs: 300,

  errorComponent: ({ error }) => {
    const message = error?.message?.toLowerCase() ?? "";
    const isNotFound =
      message.includes("not found") || message.includes("unauthorized");

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-muted-foreground">
        {isNotFound
          ? "List not found or you don't have access."
          : `Failed to load list: ${error?.message || "Unknown error"}`}
      </div>
    );
  },

  component: EditListPage,
});

function EditListPage() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { show: showBanner } = useBannerStore();
  const queryClient = useQueryClient();
  const trpcHook = useTRPC();

  const form = useForm<EditListFormData>({
    resolver: zodResolver(editListSchema),
    defaultValues: {
      title: "",
      description: "",
    },
    mode: "onChange",
  });

  const listQueryKey = trpcHook.list.getOne.queryKey({ id: listId ?? "" });

  const { data: list, isPending: isListPending } = useQuery(
    trpcHook.list.getOne.queryOptions(
      { id: listId ?? "" },
      {
        staleTime: 5 * 60 * 1000,
        enabled: !!listId,
      },
    ),
  );

  const updateMutation = useMutation(
    trpcHook.list.update.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: listQueryKey });
        await queryClient.cancelQueries({
          queryKey: trpcHook.list.getAll.queryKey(),
        });

        const prevDetail = queryClient.getQueryData(listQueryKey);
        const prevAll = queryClient.getQueryData(
          trpcHook.list.getAll.queryKey(),
        );

        if (prevDetail) {
          queryClient.setQueryData(listQueryKey, (old) => ({
            ...old!,
            ...input,
            updatedAt: new Date().toISOString(),
          }));
        }

        queryClient.setQueryData(trpcHook.list.getAll.queryKey(), (old = []) =>
          old.map((l) =>
            l.id === input.id
              ? { ...l, ...input, updatedAt: new Date().toISOString() }
              : l,
          ),
        );

        return { prevDetail, prevAll };
      },

      onError: (_, __, context) => {
        if (context?.prevDetail) {
          queryClient.setQueryData(listQueryKey, context.prevDetail);
        }
        if (context?.prevAll) {
          queryClient.setQueryData(
            trpcHook.list.getAll.queryKey(),
            context.prevAll,
          );
        }

        showBanner({
          message: "Failed to update list. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: listQueryKey });
        queryClient.invalidateQueries({
          queryKey: trpcHook.list.getAll.queryKey(),
        });
      },

      onSuccess: () => {
        showBanner({
          message: "List updated successfully.",
          variant: "success",
          duration: 3000,
        });

        form.reset();
        navigate({ to: "/lists", replace: true });
      },
    }),
  );

  useEffect(() => {
    if (list) {
      form.reset({
        title: list.title || "",
        description: list.description ?? "",
      });
    }
  }, [list, form]);

  const handleSubmit = form.handleSubmit((data) => {
    updateMutation.mutate({
      id: listId!,
      title: data.title,
      description: data.description || undefined,
    });
  });

  const handleCancel = () => {
    navigate({ to: "/lists/$listId", params: { listId }, replace: true });
  };

  const isPending = updateMutation.isPending;

  if (!listId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        No list ID provided in URL
      </div>
    );
  }

  if (isListPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        List not found or you don't have access.
      </div>
    );
  }

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
          aria-label="Cancel and return to list"
          onClick={handleCancel}
          disabled={isPending}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Edit List
              </h1>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-8"
              data-testid="edit-list-form"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium block">
                    List name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Work, Groceries, Ideas..."
                    autoFocus
                    disabled={isPending}
                    autoComplete="off"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 justify-center">
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    !form.formState.isValid ||
                    Object.keys(form.formState.dirtyFields).length === 0
                  }
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
