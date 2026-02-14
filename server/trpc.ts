// server/trpc.ts

import { router } from "./trpc-base";

import { userRouter } from "./routers/user";
import { registerRouter } from "./routers/register";
import { loginRouter } from "./routers/login";
import { verifyEmailRouter } from "./routers/verifyEmail";
import { resetPasswordRouter } from "./routers/resetPassword";
import { refreshTokenRouter } from "./routers/refreshToken";

// ← Add these
import { listRouter } from "./routers/todo/list";
import { taskRouter } from "./routers/todo/task";

export const appRouter = router({
  user: userRouter,
  register: registerRouter.register,
  login: loginRouter.login,
  verifyEmail: verifyEmailRouter.verifyEmail,
  resetPassword: resetPasswordRouter,
  refreshToken: refreshTokenRouter,

  // New domains
  list: listRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;