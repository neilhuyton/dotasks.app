// server/trpc.ts

import { router, createCallerFactory, publicProcedure } from "./trpc-base";
import { userRouter } from "./routers/user";
import { listRouter } from "./routers/todo/list";
import { taskRouter } from "./routers/todo/task";

export const healthRouter = router({
  ping: publicProcedure.query(async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }),
});

export const appRouter = router({
  user: userRouter,

  list: listRouter,
  task: taskRouter,

  health: healthRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
