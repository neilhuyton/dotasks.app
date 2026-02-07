// __mocks__/handlers/weightUpdateGoal.ts
import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";

interface TRPCRequestBody {
  id?: number;
  input?: { goalId: string; goalWeightKg: number };
}

export const weightUpdateGoalHandler = http.post(
  "/trpc/weight.updateGoal",
  async ({ request }) => {
    let body;
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
                path: "weight.updateGoal",
              },
            },
          },
        ],
        { status: 400 },
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Unauthorized: User must be logged in",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.updateGoal",
              },
            },
          },
        ],
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
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
                path: "weight.updateGoal",
              },
            },
          },
        ],
        { status: 401 },
      );
    }

    let input: { goalId?: string; goalWeightKg?: number } | undefined;
    let id: number = 0;
    if (Array.isArray(body)) {
      input = (body[0] as TRPCRequestBody)?.input;
      id = (body[0] as TRPCRequestBody)?.id ?? 0;
    } else if (body && typeof body === "object") {
      if ("0" in body) {
        input = body["0"] as { goalId: string; goalWeightKg: number };
        id = body["0"]?.id ?? 0;
      } else if ("input" in body) {
        input = (body as TRPCRequestBody).input;
        id = (body as TRPCRequestBody).id ?? 0;
      }
    }

    const { goalId, goalWeightKg } = input || {};

    if (!goalId || !goalWeightKg || goalWeightKg <= 0) {
      return HttpResponse.json(
        [
          {
            id,
            error: {
              message: "Goal ID and valid weight are required",
              code: -32001,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "weight.updateGoal",
              },
            },
          },
        ],
        { status: 400 },
      );
    }

    return HttpResponse.json(
      [
        {
          id,
          result: {
            type: "data",
            data: {
              id: goalId,
              goalWeightKg,
              goalSetAt: new Date().toISOString(),
            },
          },
        },
      ],
      { status: 200 },
    );
  },
);
