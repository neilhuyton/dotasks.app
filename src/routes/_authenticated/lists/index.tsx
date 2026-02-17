// src/routes/_authenticated/lists/index.tsx

import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

import ListsTable from "@/components/lists/ListsTable";

export const Route = createFileRoute("/_authenticated/lists/")({
  // ← path is /lists (plugin handles nesting under _authenticated)
  component: ListsPage,
});

function ListsPage() {
  return (
    <div className="space-y-8 pb-28 sm:pb-24 md:pb-8 relative min-h-screen">
      {/* Desktop / tablet "New List" button */}
      <div className="hidden md:flex justify-end px-4 sm:px-6 lg:px-8">
        <Link
          to="/lists/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 
                     bg-blue-600 text-white font-medium rounded-lg 
                     shadow-sm hover:bg-blue-700 focus:bg-blue-700 
                     transition-colors duration-200 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 
                     focus:ring-offset-2 focus:ring-offset-gray-50"
        >
          <Plus size={20} strokeWidth={2.5} />
          New List
        </Link>
      </div>
      <ListsTable />

      <div className="fixed bottom-20 sm:bottom-24 right-6 z-[60] md:hidden">
        <Link
          to="/lists/new"
          className="flex items-center justify-center w-14 h-14 
                     bg-blue-600 text-white rounded-full shadow-xl 
                     hover:bg-blue-700 active:bg-blue-800 
                     transition-all duration-200 transform 
                     hover:scale-105 active:scale-95 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 
                     focus:ring-offset-2 focus:ring-offset-gray-50"
          aria-label="Create new list"
        >
          <Plus size={28} strokeWidth={2.5} />
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
