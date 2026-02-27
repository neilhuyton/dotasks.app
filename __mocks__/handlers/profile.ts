// __mocks__/handlers/profile.ts
import { trpcMsw } from "../trpcMsw";

export const getCurrentUserHandler = trpcMsw.user.getCurrent.query(() => {
  return {
    id: "test-user-123",
    email: "testuser@example.com",
  };
});

export const getCurrentUserLoadingHandler = trpcMsw.user.getCurrent.query(
  () => {
    return new Promise(() => {}); // never resolves → isLoading = true
  },
);

export const updateEmailSuccessHandler = trpcMsw.user.updateEmail.mutation(
  ({ input }) => {
    return {
      message: "Email updated successfully",
      email: input.email,
    };
  },
);

export const updateEmailHandler = trpcMsw.user.updateEmail.mutation(() => {
  throw new Error("Email already in use");
});

export const sendPasswordResetHandler = trpcMsw.resetPassword.request.mutation(
  () => {
    return {
      message: "Reset link sent successfully",
    };
  },
);
