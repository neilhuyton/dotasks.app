// __mocks__/handlers/resetPasswordConfirm.ts
import { http, HttpResponse } from "msw";
import { mockUsers, type MockUser } from "../mockUsers";
import bcrypt from "bcryptjs";
import type { inferProcedureInput } from "@trpc/server";
import type { AppRouter } from "../../server/trpc";

interface TrpcRequestBody {
  "0": inferProcedureInput<AppRouter["resetPassword"]["confirm"]>; // { token: string, newPassword: string }
}

export const resetPasswordConfirmHandler = http.post(
  "/trpc/resetPassword.confirm",
  async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid request body",
              code: -32600,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "resetPassword.confirm",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (!body || typeof body !== "object" || !("0" in body)) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid request body",
              code: -32600,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "resetPassword.confirm",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    const input = (body as TrpcRequestBody)["0"];
    const { token, newPassword } = input || {};

    if (!token || !newPassword) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Token and new password are required",
              code: -32603,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "resetPassword.confirm",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    const user = mockUsers.find(
      (u: MockUser) => u.resetPasswordToken === token,
    );
    if (
      !user ||
      !user.resetPasswordTokenExpiresAt ||
      new Date(user.resetPasswordTokenExpiresAt) < new Date()
    ) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid or expired token",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "resetPassword.confirm",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiresAt = null;
    user.updatedAt = new Date().toISOString();

    return HttpResponse.json(
      [
        {
          id: 0,
          result: {
            data: {
              message: "Password reset successfully",
            },
          },
        },
      ],
      { status: 200 },
    );
  },
);
