// __mocks__/handlers/resetPasswordConfirm.ts
import { http, HttpResponse } from "msw";


export const resetPasswordConfirmHandler = http.post(
  '/trpc/resetPassword.confirm',
  async () => {

    // For the test, we don't care about validation — just succeed
    return HttpResponse.json(
      {
        result: {
          data: {
            message: 'Password reset successfully',
            // optional: success: true, user: { email: '...' }
          },
        },
      },
      { status: 200 }
    );
  }
);