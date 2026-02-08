// __mocks__/handlers/verifyEmail.ts
import { trpcMsw } from '../trpcMsw'; // adjust import path if needed
import { TRPCError } from '@trpc/server';
import { mockUsers, type MockUser } from '../mockUsers';
import { TEST_VERIFICATION_TOKENS } from '../../__tests__/test-constants';

export const verifyEmailHandler = trpcMsw.verifyEmail.mutation(async ({ input }) => {
  // Handle batched tRPC shape ({ "0": { token } })
  const actualInput = '0' in input ? input['0'] : input;
  const { token } = actualInput as { token?: string } ?? {};

  if (!token) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No verification token provided',
    });
  }

  // Simulate delay for specific test case
  if (token === TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const user = mockUsers.find((u: MockUser) => u.verificationToken === token);
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired verification token',
    });
  }

  if (user.isEmailVerified) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Email already verified',
    });
  }

  // Update mock user state
  user.isEmailVerified = true;
  user.verificationToken = null;
  user.updatedAt = new Date().toISOString();

  return {
    message: 'Email verified successfully!',
    email: user.email,           // ← added: required by your output schema
  };
});