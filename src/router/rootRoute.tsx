// src/router/rootRoute.ts

import { createRootRoute } from "@tanstack/react-router";
import Root from "@/components/Root";
import { trpcClient } from "@/client";
import { queryClient } from "@/queryClient";

export const rootRoute = createRootRoute<unknown>({
  component: () => <Root queryClient={queryClient} trpcClient={trpcClient} />,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
      <pre className="mt-4 rounded bg-gray-100 p-4 text-left">
        {error?.message || "Unknown error"}
      </pre>
    </div>
  ),
});
