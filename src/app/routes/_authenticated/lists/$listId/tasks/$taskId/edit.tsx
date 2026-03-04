// src/app/routes/_authenticated/lists/$listId/tasks/$taskId/edit.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc, useTRPC } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const editTaskSchema = z.object({
  title: z.string().min(1, "Task name is required").trim(),
  description: z.string().trim().optional(),
});

type EditTaskFormData = z.infer<typeof editTaskSchema>;

export const Route = createFileRoute(
  "/_authenticated/lists/$listId/tasks/$taskId/edit",
)({
  loader: async ({ context: { queryClient }, params }) => {
    const { listId, taskId } = params;

    if (!listId || !taskId) {
      return {};
    }

    await queryClient.ensureQueryData(
      trpc.task.getByList.queryOptions(
        { listId },
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
          ? "Task or list not found or you don't have access."
          : `Failed to load: ${error?.message || "Unknown error"}`}
      </div>
    );
  },

  component: EditTaskPage,
});

function EditTaskPage() {
  const { listId, taskId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { show: showBanner } = useBannerStore();
  const queryClient = useQueryClient();
  const trpcHook = useTRPC();

  const queryInput = { listId: listId ?? "" };
  const queryKey = trpcHook.task.getByList.queryKey(queryInput);

  const { data: tasks = [], isPending: isTasksPending } = useQuery(
    trpcHook.task.getByList.queryOptions(queryInput, {
      staleTime: 5 * 60 * 1000,
      enabled: !!listId,
    }),
  );

  const task = tasks.find((t) => t.id === taskId);

  const form = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: "",
      description: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (task) {
      form.reset(
        {
          title: task.title || "",
          description: task.description ?? "",
        },
        {
          keepDirty: false,
          keepErrors: true,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepDefaultValues: false,
        },
      );
    }
  }, [task, form]);

  const updateMutation = useMutation(
    trpcHook.task.update.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });

        const previousTasks =
          queryClient.getQueryData<typeof tasks>(queryKey) ?? [];

        queryClient.setQueryData<typeof tasks>(queryKey, (old = []) =>
          old.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  title: variables.title ?? t.title,
                  description: variables.description ?? t.description ?? null,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );

        return { previousTasks };
      },

      onError: (_, __, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData(queryKey, context.previousTasks);
        }
        showBanner({
          message: "Failed to update task. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },

      onSuccess: () => {
        showBanner({
          message: "Task updated successfully.",
          variant: "success",
          duration: 3000,
        });

        form.reset();
        navigate({
          to: "/lists/$listId",
          params: { listId },
          replace: true,
        });
      },
    }),
  );

  const handleSubmit = form.handleSubmit((data) => {
    if (!taskId) return;
    updateMutation.mutate({
      id: taskId,
      title: data.title,
      description: data.description || undefined,
    });
  });

  const handleCancel = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  const isPending = updateMutation.isPending || isTasksPending;

  if (!listId || !taskId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Missing list or task ID
      </div>
    );
  }

  if (isTasksPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Task not found or you don't have access.
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
          aria-label="Cancel and return to task list"
          onClick={handleCancel}
          disabled={isPending}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Edit Task
              </h1>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-8"
              data-testid="edit-task-form"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium block">
                    Task name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="e.g. Finish quarterly report"
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

                {/* Uncomment if/when you want to support task descriptions */}
                {/* <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium block">
                    Description (optional)
                  </label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Add more details..."
                    disabled={isPending}
                    rows={6}
                    autoComplete="off"
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div> */}
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
