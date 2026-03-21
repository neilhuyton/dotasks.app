import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useListCreate } from "@/hooks/list/useListCreate";
import { trpc } from "@/trpc";

export const Route = createFileRoute("/_authenticated/lists/new")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(
      trpc.list.getAll.queryOptions(undefined, {
        staleTime: 30_000,
      }),
    );
    return {};
  },

  component: CreateListPage,
});

function CreateListPage() {
  const navigate = Route.useNavigate();

  const { createList, isCreating } = useListCreate();

  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    createList(
      { title: trimmed },
      {
        onSuccess: () => {
          navigate({ to: "/lists", replace: true });
        },
      },
    );
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
          disabled={isCreating}
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
                    disabled={isCreating}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 justify-center">
                <Button
                  type="submit"
                  disabled={isCreating || !title.trim()}
                  className="w-full sm:w-40"
                  data-testid="create-button"
                >
                  {isCreating && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isCreating ? "Creating..." : "Create List"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCreating}
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
