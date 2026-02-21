// src/types/trpc.ts  (or src/lib/trpc-types.ts, src/utils/trpc.ts, etc.)

import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '@/../server/trpc';   // adjust path to your root router

export type RouterOutput = inferRouterOutputs<AppRouter>;
export type RouterInput  = inferRouterInputs<AppRouter>;

// Convenience aliases for the most commonly used endpoints

// Lists
export type List         = RouterOutput['list']['getAll'][number];
export type ListDetail   = RouterOutput['list']['getOne'];
export type ListCreateInput = RouterInput['list']['create'];

// Tasks
export type Task         = RouterOutput['task']['getByList'][number];
export type TaskDetail   = RouterOutput['task']['getOne'];
export type TaskCreateInput = RouterInput['task']['create'];
