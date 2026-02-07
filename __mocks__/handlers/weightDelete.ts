// __mocks__/handlers/weightDelete.ts
import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";
import { weights } from "./weightsData"; // Import shared weights

export const weightDeleteHandler = http.post(
  "/trpc/weight.delete",
  async ({ request }) => {
    type TrpcRequestBody = { [key: string]: { weightId: string; id?: number } };
    const body = (await request.json()) as TrpcRequestBody | null;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Unauthorized",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.delete",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    const token = authHeader.split(" ")[1];
    let userId: string | null = null;
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as { userId: string };
      userId = decoded.userId;
    } catch {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid token",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.delete",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (userId === "error-user-id") {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Failed to delete weight",
              code: -32002,
              data: {
                code: "INTERNAL_SERVER_ERROR",
                httpStatus: 500,
                path: "weight.delete",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    const input = body?.["0"];
    if (!input || !input.weightId) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid input",
              code: -32001,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "weight.delete",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (weights.some((w) => w.id === input.weightId)) {
      weights.splice(
        weights.findIndex((w) => w.id === input.weightId),
        1,
      );
      return HttpResponse.json([
        {
          id: input?.id ?? 0,
          result: {
            data: { id: input.weightId },
          },
        },
      ]);
    }

    return HttpResponse.json(
      [
        {
          id: input?.id ?? 0,
          error: {
            message: "Weight measurement not found",
            code: -32001,
            data: {
              code: "NOT_FOUND",
              httpStatus: 404,
              path: "weight.delete",
            },
          },
        },
      ],
      { status: 200 },
    );
  },
);
