// __mocks__/handlers/weightUpdateGoal.ts
import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";
import {
  badRequestResponse,
  invalidJsonResponse,
  invalidTokenResponse,
  unauthorizedResponse,
} from "./utils";

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
      return invalidJsonResponse("weight.updateGoal");
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorizedResponse("weight.updateGoal");
    }

    const token = authHeader.split(" ")[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch {
      return invalidTokenResponse("weight.updateGoal");
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
      return badRequestResponse("Goal ID and valid weight are required", "weight.updateGoal");
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
