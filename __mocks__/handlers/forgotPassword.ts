// __mocks__/handlers/forgotPassword.ts
import { http, HttpResponse } from "msw";
import { mockUsers } from "../mockUsers";

export const forgotPasswordHandler = http.post(
  "/trpc/forgotPassword",
  async ({ request }) => {
    const body = (await request.json()) as {
      [key: string]: { id?: number; email?: string };
    };
    const input = body["0"];
    const id = input?.id ?? 0;
    const user = mockUsers.find((u) => u.email === input?.email);
    if (!user) {
      return HttpResponse.json(
        [
          {
            id,
            error: {
              message: "No user found with this email",
              code: -32603,
              data: {
                code: "NOT_FOUND",
                httpStatus: 400,
                path: "forgotPassword",
              },
            },
          },
        ],
        { status: 400 },
      );
    }
    return HttpResponse.json([
      {
        id,
        result: {
          data: {
            message: "Password reset email sent. Please check your inbox.",
          },
        },
      },
    ]);
  },
);
