// src/routes/_authenticated/lists/index.tsx

import { Outlet, createFileRoute } from "@tanstack/react-router";

import ListsTable from "@/components/lists/ListsTable";
import { PageContainer } from "@/components/PageContainer";
import { FabButton } from "@/components/FabButton";

export const Route = createFileRoute("/_authenticated/lists/")({
  component: ListsPage,
});

function ListsPage() {
  return (
    <PageContainer className="relative pb-24 md:pb-28">
      <ListsTable />

      <FabButton
        to="/lists/new"
        label="Create new list"
        testId="fab-add-list"
      />

      <Outlet />
    </PageContainer>
  );
}
