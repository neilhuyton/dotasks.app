// src/pages/ListsPage.tsx

import { Outlet } from "@tanstack/react-router";

import ListsTable from "@/components/lists/ListsTable";

export default function ListsPage() {
  return (
    <div className="space-y-8">
      <ListsTable />

       <Outlet />
    </div>
  );
}
