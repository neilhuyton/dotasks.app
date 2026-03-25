// src/hooks/list/types.ts
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

export type ListSummary =
  inferRouterOutputs<AppRouter>["list"]["getAll"][number];
export type ListDetail = inferRouterOutputs<AppRouter>["list"]["getOne"];
