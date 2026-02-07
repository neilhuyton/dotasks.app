// __mocks__/handlers/weightGetCurrentGoal.ts
import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";

interface TRPCRequestBody {
  id: number;
  method: string;
  path: string;
}

export const weightGetCurrentGoalHandler = http.post(
  "/trpc/weight.getCurrentGoal",
  async ({ request }) => {
    // Clone the request to avoid consuming the body
    const requestClone = request.clone();
    let requestBody: unknown;
    try {
      requestBody = await requestClone.json();
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return HttpResponse.json(
        [
          {
            id: 1,
            error: {
              message: "Invalid request body",
              code: -32000,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "weight.getCurrentGoal",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    const requests = Array.isArray(requestBody) ? requestBody : [requestBody];
    const goalRequest = requests.find(
      (req: TRPCRequestBody) => req.path === "weight.getCurrentGoal",
    );

    if (!goalRequest) {
      return; // Pass to other handlers
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json(
        [
          {
            id: goalRequest.id,
            error: {
              message: "Unauthorized",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.getCurrentGoal",
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
            id: goalRequest.id,
            error: {
              message: "Invalid token",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.getCurrentGoal",
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
            id: goalRequest.id,
            error: {
              message: "Failed to fetch goal",
              code: -32002,
              data: {
                code: "INTERNAL_SERVER_ERROR",
                httpStatus: 500,
                path: "weight.getCurrentGoal",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (userId === "empty-user-id") {
      return HttpResponse.json(
        [{ id: goalRequest.id, result: { type: "data", data: null } }],
        { status: 200 },
      );
    }

    const mockGoal = {
      id: "1",
      goalWeightKg: 65,
      goalSetAt: "2023-10-01T00:00:00Z",
    };
    return HttpResponse.json(
      [{ id: goalRequest.id, result: { type: "data", data: mockGoal } }],
      { status: 200 },
    );
  },
);
