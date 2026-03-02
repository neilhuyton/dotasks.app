// src/app/routes/_authenticated/lists/$listId.tsx

import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { useListTasks } from "@/hooks/useListTasks";
import { trpc } from "@/trpc";
import { Outlet } from "@tanstack/react-router";
import { FabButton } from "@/app/components/FabButton";
import { useAuthStore } from "@/shared/store/authStore";
import { useQuery } from "@tanstack/react-query";
import TaskList from "@/features/tasks/components/TaskList";

export const Route = createFileRoute("/_authenticated/lists/$listId")({
  loader: async ({ context: { queryClient }, params }) => {
    const { listId } = params;
    const { accessToken } = useAuthStore.getState();

    if (!accessToken || !listId) return {};

    await queryClient.ensureQueryData(
      trpc.list.getOne.queryOptions(
        { id: listId },
        { staleTime: 5 * 60 * 1000 },
      ),
    );

    return {};
  },

  pendingComponent: () => (
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
  ),

  pendingMs: 0,
  pendingMinMs: 400,

  errorComponent: ({ error }) => {
    const message = error?.message?.toLowerCase() ?? "";
    const isNotFound = message.includes("not found");

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-muted-foreground">
        {isNotFound
          ? "List not found or you don't have access."
          : `Failed to load list: ${error?.message || "Unknown error"}`}
      </div>
    );
  },

  component: ListDetail,
});

function ListDetail() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();

  const {
    data: list,
    isLoading: isListLoading,
    isError: isListError,
  } = useQuery(
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
        No list ID provided in URL
      </div>
    );
  }

  if (isListLoading || isLoadingTasks) {
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

  if (isListError || !list) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        List not found or you don't have access.
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