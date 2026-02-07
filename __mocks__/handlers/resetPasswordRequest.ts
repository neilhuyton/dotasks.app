import { http, HttpResponse } from "msw";
import type { inferProcedureInput } from "@trpc/server";
import type { AppRouter } from "../../server/trpc";

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
                path: "resetPassword.request",
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
                path: "resetPassword.request",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    const input = (body as TrpcRequestBody)["0"];
    const { email } = input || {};

    if (!email) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid email",
              code: -32603,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "resetPassword.request",
              },
            },
          },
        ],
        { status: 200 },
      );
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
