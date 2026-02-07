import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";
import type { DefaultBodyType } from "msw";

interface TRPCRequestBody {
  id?: number;
  input?: { goalWeightKg?: number };
}

export const weightSetGoalHandler = http.post(
  "/trpc/weight.setGoal",
  async ({ request }) => {
    let body: DefaultBodyType;
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
                path: "weight.setGoal",
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
                path: "weight.setGoal",
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
                path: "weight.setGoal",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    let input: { goalWeightKg?: number } | undefined;
    let id: number = 0;
    if (Array.isArray(body)) {
      input = (body[0] as TRPCRequestBody)?.input;
      id = (body[0] as TRPCRequestBody)?.id ?? 0;
    } else if (body && typeof body === "object" && "input" in body) {
      input = (body as TRPCRequestBody).input;
      id = (body as TRPCRequestBody).id ?? 0;
    }

    const goalWeightKg = input?.goalWeightKg;

    if (!goalWeightKg || goalWeightKg <= 0) {
      return HttpResponse.json(
        [
          {
            id,
            error: {
              message: "Goal weight must be a positive number",
              code: -32001,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "weight.setGoal",
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
          type: "data",
          data: { id: "2", goalWeightKg, goalSetAt: new Date().toISOString() },
        },
      },
    ]);
  },
);
