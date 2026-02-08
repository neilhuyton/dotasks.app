// server/trpc.ts
import { router } from './trpc-base';  // ← import router (the function), not t

import { userRouter } from './routers/user';
import { registerRouter } from './routers/register';
import { loginRouter } from './routers/login';
import { verifyEmailRouter } from './routers/verifyEmail';
import { weightRouter } from './routers/weight';
import { resetPasswordRouter } from './routers/resetPassword';
import { refreshTokenRouter } from './routers/refreshToken';

export const appRouter = router({
  user: userRouter,
  register: registerRouter.register,     // if registerRouter = router({ register: ... })
  login: loginRouter.login,               // same pattern
  verifyEmail: verifyEmailRouter.verifyEmail,
  weight: weightRouter,
  resetPassword: resetPasswordRouter,     // has request & confirm sub-procedures
  refresh: refreshTokenRouter.refresh,    // ← note: usually called refresh, not refreshToken
});

export type AppRouter = typeof appRouter;