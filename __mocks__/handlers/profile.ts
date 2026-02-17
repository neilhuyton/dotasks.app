// __mocks__/handlers/profile.ts

import { trpcMsw } from "../trpcMsw";
import { mockUsers } from "../mockUsers";
import { TRPCError } from "@trpc/server";

// Current user – fixed response
export const getCurrentUserHandler = trpcMsw.user.getCurrent.query(async () => {
  const user = mockUsers.find((u) => u.id === "test-user-123");

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return {
    id: user.id,
    email: user.email || "testuser@example.com",
  };
});

// Loading variant – never resolves
export const getCurrentUserLoadingHandler = trpcMsw.user.getCurrent.query(async () => {
  return new Promise(() => {}); // hangs forever → isLoading: true
});

// Update email – success or conflict based on mock data
export const updateEmailHandler = trpcMsw.user.updateEmail.mutation(
  async ({ input }) => {
    const { email: newEmail } = input;

    const user = mockUsers.find((u) => u.id === "test-user-123");
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Simulate conflict if email already used by someone else
    if (mockUsers.some((u) => u.email === newEmail && u.id !== "test-user-123")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This email is already in use by another account",
      });
    }

    user.email = newEmail;

    return {
      message: "Email updated successfully",
      email: newEmail,
    };
  }
);

// Force success variant
export const updateEmailSuccessHandler = trpcMsw.user.updateEmail.mutation(async ({ input }) => {
  const { email: newEmail } = input;
  return {
    message: "Email updated successfully",
    email: newEmail,
  };
});

// Password reset request – always success
export const sendPasswordResetHandler = trpcMsw.resetPassword.request.mutation(async () => {
  return {
    message: "If an account with this email exists, a reset link has been sent.",
  };
});