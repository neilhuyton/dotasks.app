// server/trpc.ts

import { router, createCallerFactory } from "./trpc-base";

import { userRouter } from "./routers/user";
import { registerRouter } from "./routers/register";
import { loginRouter } from "./routers/login";
import { verifyEmailRouter } from "./routers/verifyEmail";
import { resetPasswordRouter } from "./routers/resetPassword";
import { refreshTokenRouter } from "./routers/refreshToken";

import { listRouter } from "./routers/todo/list";
import { taskRouter } from "./routers/todo/task";
import { publicProcedure } from "./trpc-base";
import { verificationRouter } from "./routers/verification";

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
  register: registerRouter.register,
  login: loginRouter.login,
  verifyEmail: verifyEmailRouter.verifyEmail,
  resetPassword: resetPasswordRouter,
  refreshToken: refreshTokenRouter,
  verification: verificationRouter,

  list: listRouter,
  task: taskRouter,

  health: healthRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
