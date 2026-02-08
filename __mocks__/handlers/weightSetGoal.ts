import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";
import {
  badRequestResponse,
  invalidJsonResponse,
  invalidTokenResponse,
  unauthorizedResponse,
} from "./utils";

interface UpdateGoalInput {
  goalId: string;
  goalWeightKg: number;
}

interface TrpcRequestItem {
  id?: number | unknown;
  json?: unknown;
  input?: unknown;
  params?: { input?: unknown } | unknown;
}

export const weightUpdateGoalHandler = http.post(
  "/trpc/weight.updateGoal",
  async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalidJsonResponse("weight.updateGoal");
    }

    // Normalize to array (handle both batch and single request)
    const requests: TrpcRequestItem[] = Array.isArray(body) ? body : [body as TrpcRequestItem];

    if (requests.length === 0) {
      return badRequestResponse("Empty request batch", "weight.updateGoal");
    }

    const req = requests[0];
    if (typeof req !== "object" || req === null) {
      return badRequestResponse("Invalid request item", "weight.updateGoal");
    }

    const id: number = typeof req.id === "number" ? req.id : 0;

    // Flexible input extraction - covers most common tRPC client shapes
    let inputRaw: unknown;

    if ("json" in req && req.json !== undefined) {
      inputRaw = req.json;
    } else if ("input" in req && req.input !== undefined) {
      inputRaw = req.input;
    } else if ("params" in req && typeof req.params === "object" && req.params !== null) {
      if ("input" in req.params && req.params.input !== undefined) {
        inputRaw = req.params.input;
      }
    }

    if (typeof inputRaw !== "object" || inputRaw === null) {
      return badRequestResponse("Missing or invalid input", "weight.updateGoal");
    }

    const input = inputRaw as UpdateGoalInput;

    const { goalId, goalWeightKg } = input;

    // Authentication
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

    // Validation
    if (typeof goalId !== "string" || typeof goalWeightKg !== "number" || goalWeightKg <= 0) {
      return badRequestResponse(
        "goalId (string) and positive goalWeightKg (number) are required",
        "weight.updateGoal",
      );
    }

    // Success
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