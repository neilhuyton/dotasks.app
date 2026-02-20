// src/routes/_authenticated/lists/index.tsx

import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

import ListsTable from "@/components/lists/ListsTable";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button"; // ← add this import if not already present

export const Route = createFileRoute("/_authenticated/lists/")({
  component: ListsPage,
});

function ListsPage() {
  return (
    <PageContainer>
      <div className="flex justify-end mb-8">
        <Button
          asChild
          className="inline-flex items-center gap-2 px-5 py-2.5 
                     bg-primary text-primary-foreground font-medium rounded-lg 
                     shadow-sm hover:bg-primary/90 focus:bg-primary/90 
                     transition-colors duration-200 
                     focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          <Link to="/lists/new">
            <Plus size={20} strokeWidth={2.5} />
            New List
          </Link>
        </Button>
      </div>

      <ListsTable />

      {/* Removed the mobile FAB — no duplication */}
      {/* If you ever want it back conditionally, you can re-add with md:hidden */}

      <Outlet />
    </PageContainer>
  );
}