// __mocks__/handlers/profile.ts

import { trpcMsw } from "../trpcMsw";
import { mockUsers } from "../mockUsers";
import { TRPCError } from "@trpc/server";

// Ensure our test user exists in mockUsers (safety check)
const ensureTestUser = () => {
  if (!mockUsers.some((u) => u.id === "test-user-123")) {
    mockUsers.push({
      id: "test-user-123",
      email: "testuser@example.com",
      password: "$2b$10$BfZjnkEBinREhMQwsUwFjOdeidxX1dvXSKn.n3MxdwmRTcfV8JR16",
      verificationToken: null,
      isEmailVerified: true,
      resetPasswordToken: null,
      resetPasswordTokenExpiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refreshToken: "mock-refresh-token-for-tests",
    });
  }
};

// Current user – success response
export const getCurrentUserHandler = trpcMsw.user.getCurrent.query(async () => {
  ensureTestUser();
  const user = mockUsers.find((u) => u.id === "test-user-123");
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  return {
    id: user.id,
    email: user.email || "testuser@example.com",
  };
});

// Loading variant – hangs to simulate isLoading
export const getCurrentUserLoadingHandler = trpcMsw.user.getCurrent.query(async () => {
  return new Promise(() => {}); // never resolves
});

// Update email – throws CONFLICT when email is taken by another user
export const updateEmailHandler = trpcMsw.user.updateEmail.mutation(
  async ({ input }) => {
    ensureTestUser();

    const { email: newEmail } = input;

    const currentUser = mockUsers.find((u) => u.id === "test-user-123");
    if (!currentUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check if new email is already used by **another** user
    const emailTaken = mockUsers.some(
      (u) => u.email === newEmail && u.id !== "test-user-123"
    );

    if (emailTaken) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This email is already in use by another account",
      });
    }

    // Simulate successful update
    currentUser.email = newEmail;
    currentUser.updatedAt = new Date().toISOString();

    return {
      message: "Email updated successfully",
      email: newEmail,
    };
  }
);

// Force success variant (no conflict possible)
export const updateEmailSuccessHandler = trpcMsw.user.updateEmail.mutation(
  async ({ input }) => {
    return {
      message: "Email updated successfully",
      email: input.email,
    };
  }
);

// Password reset – always success message
export const sendPasswordResetHandler = trpcMsw.resetPassword.request.mutation(
  async () => {
    return {
      message: "If an account with this email exists, a reset link has been sent.",
    };
  }
);