// __mocks__/handlers/resetPasswordRequest.ts
import { http, HttpResponse } from "msw";
import type { inferProcedureInput } from "@trpc/server";
import type { AppRouter } from "../../server/trpc";
import { invalidJsonResponse, badRequestResponse } from "./utils";  // ← assuming badRequestResponse is now available

interface TrpcRequestBody {
  "0": inferProcedureInput<AppRouter["resetPassword"]["request"]>; // { email: string }
}

export const resetPasswordRequestHandler = http.post(
  "/trpc/resetPassword.request",
  async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalidJsonResponse('resetPassword.request');
    }

    if (!body || typeof body !== "object" || !("0" in body)) {
      return badRequestResponse("Invalid request body", "resetPassword.request");
    }

    const input = (body as TrpcRequestBody)["0"];
    const { email } = input || {};

    if (!email) {
      return badRequestResponse("Invalid email", "resetPassword.request");
    }

    return HttpResponse.json(
      [
        {
          id: 0,
          result: {
            data: {
              message: "If the email exists, a reset link has been sent.",
            },
          },
        },
      ],
      { status: 200 },
    );
  },
);