// __mocks__/handlers/resetPasswordRequest.ts

import { trpcMsw } from '../trpcMsw';
import { TRPCError } from '@trpc/server';

// ────────────────────────────────────────────────
// Default: fast success (happy path for most tests)
export const resetPasswordRequestHandler = trpcMsw.resetPassword.request.mutation(
  async ({ input }) => {
    // Small realistic network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const { email } = input;

    if (typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Please enter a valid email address',
      });
    }

    // Security-friendly response – don't reveal whether the email exists
    return {
      message: 'If the email exists, a reset link has been sent.',
    };
  }
);

// ────────────────────────────────────────────────
// Delayed: specifically for testing loading/disabled states in UI
export const delayedResetPasswordRequestHandler = trpcMsw.resetPassword.request.mutation(
  async () => {
    // Longer delay so the test can observe spinner and disabled button
    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
      message: 'If the email exists, a reset link has been sent. (delayed response)',
    };
  }
);

// ────────────────────────────────────────────────
// Server-side failure simulation (e.g. database unavailable, internal error)
export const resetPasswordRequestServerErrorHandler = trpcMsw.resetPassword.request.mutation(
  async () => {
    await new Promise(resolve => setTimeout(resolve, 200));

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to process request. Please try again later.',
    });
  }
);

// ────────────────────────────────────────────────
// Rate-limit / abuse protection simulation
export const resetPasswordRequestRateLimitedHandler = trpcMsw.resetPassword.request.mutation(
  async () => {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset requests. Please wait a few minutes and try again.',
    });
  }
);

// Optional: Export default for convenience (most tests will use this one)
export default resetPasswordRequestHandler;