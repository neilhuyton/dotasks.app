// src/app/routes/_authenticated/lists/$listId.tsx

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useListTasks } from "@/hooks/useListTasks";
import { trpc } from "@/trpc";
import { FabButton } from "@/app/components/FabButton";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import TaskList from "@/features/tasks/components/TaskList";
import { useAuthStore } from "@/shared/store/authStore";
import { RouteError } from "@/app/components/RouteError";

export const Route = createFileRoute("/_authenticated/lists/$listId")({
  loader: async ({ context: { queryClient }, params }) => {
    const { listId } = params;

    if (!listId) {
      return {};
    }

    const sessionPromise = useAuthStore.getState().waitUntilReady();
    const timeout = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Auth loader timeout")), 8000),
    );

    let session;
    try {
      session = await Promise.race([sessionPromise, timeout]);
    } catch {
      session = null;
    }

    if (!session?.user?.id) {
      throw redirect({ to: "/login" });
    }

    try {
      await Promise.all([
        queryClient.ensureQueryData(
          trpc.list.getOne.queryOptions(
            { id: listId },
            { staleTime: 5 * 60 * 1000 },
          ),
        ),
        queryClient.ensureQueryData(
          trpc.task.getByList.queryOptions({ listId }),
        ),
      ]);
    } catch {
      // empty
    }

    return { session };
  },

  pendingComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="text-muted-foreground">
          Restoring session and loading data…
        </p>
      </div>
    </div>
  ),

  pendingMs: 0,
  pendingMinMs: 400,

  errorComponent: ({ error, reset }) => {
    const message = error?.message?.toLowerCase() ?? "";
    const isNotFound =
      message.includes("not found") || message.includes("unauthorized");

    return (
      <RouteError
        error={error}
        reset={reset}
        title={isNotFound ? "List not found" : "Failed to load list"}
        message={
          isNotFound
            ? "This list doesn't exist or you don't have access to it."
            : undefined
        }
        backTo="/lists"
        backLabel="Back to Lists"
      />
    );
  },

  component: ListDetailPage,
});

function ListDetailPage() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { data: list, isLoading: isListLoading } = useQuery(
    trpc.list.getOne.queryOptions(
      { id: listId ?? "" },
      {
        staleTime: 5 * 60 * 1000,
        enabled: !!listId,
      },
    ),
  );

  const {
    tasks,
    isLoadingTasks,
    toggleTask,
    pendingToggleIds,
    deleteTaskPending,
    setCurrentTask,
    setCurrentTaskPending,
    clearCurrentTask,
    clearCurrentTaskPending,
    updateTaskOrder,
    isReordering,
  } = useListTasks(listId);

  if (!listId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        No list ID provided in the URL
      </div>
    );
  }

  if ((isListLoading || isLoadingTasks) && (!list || tasks.length === 0)) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[52px] animate-pulse rounded-md bg-muted/70 border"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        List not found or you don't have access to it.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 sm:space-y-8 pb-18">
        <div className="flex items-center gap-3">
          <Link
            to="/lists"
            aria-label="Back to all lists"
            title="Back to all lists"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>

          <h1 className="flex-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {list.title}
          </h1>
        </div>

        {list.description && (
          <p className="text-base text-muted-foreground sm:text-lg">
            {list.description}
          </p>
        )}

        <TaskList
          tasks={tasks}
          toggleTask={toggleTask}
          pendingToggleIds={pendingToggleIds}
          onDelete={(taskId) =>
            navigate({
              to: "/lists/$listId/tasks/$taskId/delete",
              params: { listId, taskId },
            })
          }
          isDeleting={deleteTaskPending}
          setCurrentTask={setCurrentTask}
          isSettingCurrent={setCurrentTaskPending}
          clearCurrentTask={clearCurrentTask}
          clearCurrentTaskPending={clearCurrentTaskPending}
          listId={listId}
          updateTaskOrder={updateTaskOrder}
          isReordering={isReordering}
        />
      </div>

      <FabButton
        to="/lists/$listId/tasks/new"
        params={{ listId }}
        label="Add new task"
        testId="fab-add-task"
      />

      <Outlet />
    </>
  );
}
