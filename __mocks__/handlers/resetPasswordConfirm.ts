// __mocks__/handlers/resetPasswordConfirm.ts

import { trpcMsw } from '../trpcMsw';
import { TRPCError } from '@trpc/server';

// ────────────────────────────────────────────────
// Default: fast success (used in most happy-path tests)
export const resetPasswordConfirmHandler = trpcMsw.resetPassword.confirm.mutation(
  async () => {
    // Small realistic network delay
    await new Promise(resolve => setTimeout(resolve, 80));

    return {
      message: 'Password reset successfully',
    };
  }
);

// ────────────────────────────────────────────────
// Delayed: for testing loading/disabled states in UI
export const delayedResetPasswordConfirmHandler = trpcMsw.resetPassword.confirm.mutation(
  async () => {
    // Longer delay to give time to see spinner / disabled form
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      message: 'Password reset successfully (delayed response)',
    };
  }
);

// ────────────────────────────────────────────────
// Invalid / expired token error
export const resetPasswordConfirmInvalidTokenHandler = trpcMsw.resetPassword.confirm.mutation(
  async () => {
    await new Promise(resolve => setTimeout(resolve, 120));

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid or expired token',
    });
  }
);

// ────────────────────────────────────────────────
// Generic server-side failure
export const resetPasswordConfirmServerErrorHandler = trpcMsw.resetPassword.confirm.mutation(
  async () => {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to reset password. Please try again later.',
    });
  }
);

// ────────────────────────────────────────────────
// Weak / invalid password (client would usually catch this, but backend can too)
export const resetPasswordConfirmWeakPasswordHandler = trpcMsw.resetPassword.confirm.mutation(
  async () => {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Password must be at least 8 characters long and include a number and special character',
    });
  }
);