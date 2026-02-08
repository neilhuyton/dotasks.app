// __mocks__/handlers/weightGetCurrentGoal.ts
import { http, HttpResponse } from "msw";
import {
  authenticateRequest,
  invalidJsonResponse,
  internalServerErrorResponse,
} from "./utils";

interface TRPCRequestBody {
  id: number;
  method: string;
  path: string;
}

export const weightGetCurrentGoalHandler = http.post(
  "/trpc/weight.getCurrentGoal",
  async ({ request }) => {
    // Clone because we need to read the body multiple times if needed
    const requestClone = request.clone();
    let requestBody: unknown;

    try {
      requestBody = await requestClone.json();
    } catch {
      return invalidJsonResponse("weight.getCurrentGoal");
    }

    const requests = Array.isArray(requestBody) ? requestBody : [requestBody];
    const goalRequest = requests.find(
      (req: TRPCRequestBody) => req.path === "weight.getCurrentGoal",
    );

    if (!goalRequest) {
      return; // Not our procedure → let other handlers deal with it
    }

    // Use the reusable authentication helper
    const auth = authenticateRequest(request, "weight.getCurrentGoal");

    if (auth.response) {
      // Auth failed → patch the correct id and return the error response
      const body = await auth.response.json();
      if (body.length > 0) {
        body[0].id = goalRequest.id;
      }
      return HttpResponse.json(body, { status: auth.response.status || 200 });
    }

    const { userId } = auth;

    // Special test cases
    if (userId === "error-user-id") {
      const errorResponse = internalServerErrorResponse(
        "Failed to fetch goal",
        "weight.getCurrentGoal",
      );

      // Patch the real request id
      const errorBody = await errorResponse.json();
      if (errorBody.length > 0) {
        errorBody[0].id = goalRequest.id;
      }

      return HttpResponse.json(errorBody, { status: 200 });
    }

    if (userId === "empty-user-id") {
      return HttpResponse.json(
        [{ id: goalRequest.id, result: { type: "data", data: null } }],
        { status: 200 },
      );
    }

    // Normal success case
    const mockGoal = {
      id: "1",
      goalWeightKg: 65,
      goalSetAt: "2023-10-01T00:00:00Z",
    };

    return HttpResponse.json(
      [
        {
          id: goalRequest.id,
          result: {
            type: "data",
            data: mockGoal,
          },
        },
      ],
      { status: 200 },
    );
  },
);