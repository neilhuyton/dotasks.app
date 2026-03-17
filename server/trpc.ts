import { router, createCallerFactory } from "@steel-cut/trpc-shared/server";
import { userRouter, healthRouter } from "@steel-cut/trpc-shared/server";
import { listRouter } from "./routers/todo/list";
import { taskRouter } from "./routers/todo/task";

export const appRouter = router({
  user: userRouter,
  health: healthRouter,
  list: listRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
