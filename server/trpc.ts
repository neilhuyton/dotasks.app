import { router, createCallerFactory } from "@steel-cut/trpc-shared/server";
import { userRouter, healthRouter } from "@steel-cut/trpc-shared/server";

export const appRouter = router({
  user: userRouter,
  health: healthRouter,
  // add app specific routers here
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
