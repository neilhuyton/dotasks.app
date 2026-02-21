// src/routes/_authenticated/lists/index.tsx

import { Outlet, createFileRoute } from "@tanstack/react-router";

import ListsTable from "@/components/lists/ListsTable";
import { PageContainer } from "@/components/PageContainer";
import { FabButton } from "@/components/FabButton";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/_authenticated/lists/")({
  component: ListsPage,
});

function ListsPage() {
  const { userId } = useAuthStore();
  const { data: lists = [], isLoading } = trpc.list.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  const listCount = lists.length;

  return (
    <PageContainer className="relative pb-20 md:pb-24">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Your Lists
          </h1>

          {!isLoading && listCount > 0 && (
            <div className="text-sm font-medium text-muted-foreground">
              {listCount} {listCount === 1 ? "list" : "lists"}
            </div>
          )}
        </div>

        <ListsTable />
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
