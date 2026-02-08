// server/trpc.ts
import { router } from "./trpc-base";

import { userRouter } from "./routers/user";
import { registerRouter } from "./routers/register";
import { loginRouter } from "./routers/login";
import { verifyEmailRouter } from "./routers/verifyEmail";
import { weightRouter } from "./routers/weight";
import { resetPasswordRouter } from "./routers/resetPassword";
import { refreshTokenRouter } from "./routers/refreshToken";

export const appRouter = router({
  user: userRouter,
  register: registerRouter.register,
  login: loginRouter.login,
  verifyEmail: verifyEmailRouter.verifyEmail,
  weight: weightRouter,
  resetPassword: resetPasswordRouter,
  refreshToken: refreshTokenRouter,
});

export type AppRouter = typeof appRouter;
