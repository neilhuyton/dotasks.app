// src/app/routes/_authenticated/lists/index.tsx

import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useLists } from "@/hooks/useLists";

import { SortableListsTable } from "@/features/lists/components/SortableListsTable";
import { FabButton } from "@/app/components/FabButton";
import { useAuthStore } from "@/shared/store/authStore";
import { trpc } from "@/trpc";

export const Route = createFileRoute("/_authenticated/lists/")({
  loader: async ({ context: { queryClient } }) => {
    const { user } = useAuthStore.getState();

    if (!user) {
      return {};
    }

    await queryClient.ensureQueryData(trpc.list.getAll.queryOptions(undefined));

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

  errorComponent: ({ error }) => (
    <div className="text-center text-muted-foreground">
      <p className="text-lg font-medium">Failed to load your lists</p>
      <p className="mt-2">
        {error?.message || "Something went wrong. Please try again later."}
      </p>
    </div>
  ),

  component: ListsPage,
});

function ListsPage() {
  const { lists = [], updateListOrder, isReordering } = useLists();

  const listCount = lists.length;

  if (listCount === 0) {
    return (
      <>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Your Lists
            </h1>
            <p className="mt-3 text-muted-foreground">
              You don't have any lists yet.
            </p>
          </div>

          <FabButton
            to="/lists/new"
            label="Create your first list"
            testId="fab-add-list"
            size="lg"
            pulse={true}
          />
        </div>

        <Outlet />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 sm:space-y-8 pb-18">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Your Lists
          </h1>
          <div className="text-sm font-medium text-muted-foreground">
            {listCount} {listCount === 1 ? "list" : "lists"}
          </div>
        </div>

        <SortableListsTable
          lists={lists}
          updateListOrder={updateListOrder}
          isReordering={isReordering}
        />
      </div>

      <FabButton
        to="/lists/new"
        label="Create new list"
        testId="fab-add-list"
      />

      <Outlet />
    </>
  );
}
