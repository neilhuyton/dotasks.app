// src/routes/_authenticated/lists/index.tsx

import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SortableListsTable } from "@/components/lists/SortableListsTable";
import { PageContainer } from "@/components/PageContainer";
import { FabButton } from "@/components/FabButton";
import { useLists } from "@/hooks/useLists";

export const Route = createFileRoute("/_authenticated/lists/")({
  component: ListsPage,
});

function ListsPage() {
  const { lists, isLoadingLists, updateListOrder, isReordering } = useLists();

  const listCount = lists.length;

  return (
    <PageContainer className="relative pb-20 md:pb-24">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Your Lists
          </h1>
          {!isLoadingLists && listCount > 0 && (
            <div className="text-sm font-medium text-muted-foreground">
              {listCount} {listCount === 1 ? "list" : "lists"}
            </div>
          )}
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
    </PageContainer>
  );
}
