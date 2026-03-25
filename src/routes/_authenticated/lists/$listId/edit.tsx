import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc, useTRPC } from "@/trpc";
import { RouteError } from "@steel-cut/steel-lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListUpdate } from "@/features/lists/useListUpdate";

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

  errorComponent: ({ error, reset }) => (
    <RouteError
      error={error}
      reset={reset}
      title="Failed to load list for editing"
      backLabel="Back to Lists"
    />
  ),

  component: EditListPage,
});

function EditListPage() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { updateList, isUpdating } = useListUpdate();

  const form = useForm<EditListFormData>({
    resolver: zodResolver(editListSchema),
    defaultValues: {
      title: "",
      description: "",
    },
    mode: "onChange",
  });

  const trpcHook = useTRPC();

  const { data: list, isPending: isListPending } = useQuery(
    trpcHook.list.getOne.queryOptions(
      { id: listId ?? "" },
      {
        staleTime: 5 * 60 * 1000,
        enabled: !!listId,
      },
    ),
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
    if (!listId) return;

    updateList(
      {
        id: listId,
        title: data.title,
        description: data.description || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          navigate({ to: "/lists", replace: true });
        },
      },
    );
  });

  const handleCancel = () => {
    navigate({ to: "/lists/$listId", params: { listId }, replace: true });
  };

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
          disabled={isUpdating}
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
                    disabled={isUpdating}
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
                    isUpdating ||
                    !form.formState.isValid ||
                    Object.keys(form.formState.dirtyFields).length === 0
                  }
                  className="w-full sm:w-40"
                >
                  {isUpdating && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
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
