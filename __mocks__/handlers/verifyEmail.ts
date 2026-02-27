// __mocks__/handlers/verifyEmail.ts

import { trpcMsw } from "../trpcMsw";
import { TRPCError } from "@trpc/server";
import { mockUsers, type MockUser } from "../mockUsers";
import { TEST_VERIFICATION_TOKENS } from "../../__tests__/test-constants";

export const verifyEmailHandler = trpcMsw.verifyEmail.mutation(
  async ({ input }) => {
    // Handle both single and batched input shapes
    const actualInput = "0" in input ? input["0"] : input;
    const { token } = (actualInput as { token?: string }) ?? {};

    if (!token) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No verification token provided",
      });
    }

    // Optional: simulate network delay only for the success case
    if (token === TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS) {
      await new Promise((resolve) => setTimeout(resolve, 800)); // reasonable for tests
    }

    const user = mockUsers.find((u: MockUser) => u.verificationToken === token);

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired verification token",
      });
    }

    if (user.isEmailVerified) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already verified",
      });
    }

    // Update mock user
    user.isEmailVerified = true;
    user.verificationToken = null;
    user.updatedAt = new Date(); // ← keep as Date, not string

    // Return plain data (what your real procedure returns)
    return {
      message: "Email verified successfully!",
      email: user.email,
    };
  },
);
