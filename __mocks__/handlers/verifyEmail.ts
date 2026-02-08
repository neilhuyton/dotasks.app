// __mocks__/handlers/verifyEmail.ts
import { http, HttpResponse } from "msw";
import { mockUsers, type MockUser } from "../mockUsers";
import { TEST_VERIFICATION_TOKENS } from "../../__tests__/test-constants";
import type { inferProcedureInput } from "@trpc/server";
import type { AppRouter } from "../../server/trpc";
import { badRequestResponse } from "./utils";

interface TrpcRequestBody {
  "0": inferProcedureInput<AppRouter["verifyEmail"]>; // { token: string }
}

export const verifyEmailHandler = http.post(
  "/trpc/verifyEmail",
  async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse("Invalid request body", "verifyEmail");
    }

    if (!body || typeof body !== "object" || !("0" in body)) {
      return badRequestResponse("Invalid request body", "verifyEmail");
    }

    const input = (body as TrpcRequestBody)["0"];
    const { token } = input || {};

    if (!token) {
      return badRequestResponse("No verification token provided", "verifyEmail");
    }

    if (token === TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const user = mockUsers.find((u: MockUser) => u.verificationToken === token);
    if (!user) {
      return badRequestResponse("Invalid or expired verification token", "verifyEmail");
    }

    if (user.isEmailVerified) {
      return badRequestResponse("Email already verified", "verifyEmail");
    }

    user.isEmailVerified = true;
    user.verificationToken = null;
    user.updatedAt = new Date().toISOString();

    return HttpResponse.json(
      [
        {
          id: 0,
          result: {
            data: {
              message: "Email verified successfully!",
            },
          },
        },
      ],
      { status: 200 },
    );
  },
);