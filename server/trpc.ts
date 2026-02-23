// server/trpc.ts

import { router, createCallerFactory } from "./trpc-base"; // assuming createCallerFactory is imported from trpc-base

// Auth / User related routers
import { userRouter } from "./routers/user";
import { registerRouter } from "./routers/register";
import { loginRouter } from "./routers/login";
import { verifyEmailRouter } from "./routers/verifyEmail";
import { resetPasswordRouter } from "./routers/resetPassword";
import { refreshTokenRouter } from "./routers/refreshToken";

// Todo domain routers
import { listRouter } from "./routers/todo/list";
import { taskRouter } from "./routers/todo/task";
import { publicProcedure } from "./trpc-base";

export const healthRouter = router({
  ping: publicProcedure.query(async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      // optional: add uptime or basic DB ping if you want
    };
  }),
});

export const appRouter = router({
  // Auth & user routes
  user: userRouter,
  register: registerRouter.register,
  login: loginRouter.login,
  verifyEmail: verifyEmailRouter.verifyEmail,
  resetPassword: resetPasswordRouter,
  refreshToken: refreshTokenRouter,

  // Todo domain
  list: listRouter,
  task: taskRouter,

  health: healthRouter,
});

// Export type for client generation (e.g. @trpc/react-query, @trpc/client) and testing
export type AppRouter = typeof appRouter;

// Export caller factory – required for server-side / test direct calls
// (bypasses HTTP layer, allows testing real procedure logic with mocked context)
export const createCaller = createCallerFactory(appRouter);
