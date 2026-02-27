// __mocks__/handlers/resetPasswordRequest.ts

import { trpcMsw } from "../trpcMsw";
import { TRPCError } from "@trpc/server";

export const resetPasswordRequestHandler =
  trpcMsw.resetPassword.request.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      message: "If the email exists, a reset link has been sent.",
    };
  });

export const delayedResetPasswordRequestHandler =
  trpcMsw.resetPassword.request.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      message: "If the email exists, a reset link has been sent.",
    };
  });

export const resetPasswordRequestServerErrorHandler =
  trpcMsw.resetPassword.request.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to process request. Please try again later.",
    });
  });

export const resetPasswordRequestRateLimitedHandler =
  trpcMsw.resetPassword.request.mutation(async () => {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Try again later.",
    });
  });

export default resetPasswordRequestHandler;
