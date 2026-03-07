// src/types/trpc.ts

import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '@/../server/trpc';

export type RouterOutput = inferRouterOutputs<AppRouter>;
export type RouterInput  = inferRouterInputs<AppRouter>;

export type List         = RouterOutput['list']['getAll'][number];
export type ListDetail   = RouterOutput['list']['getOne'];
export type ListCreateInput = RouterInput['list']['create'];

export type Task         = RouterOutput['task']['getByList'][number];
export type TaskDetail   = RouterOutput['task']['getOne'];
export type TaskCreateInput = RouterInput['task']['create'];
