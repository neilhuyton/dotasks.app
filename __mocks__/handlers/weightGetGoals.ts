// __mocks__/handlers/weightGetGoals.ts
import { http, HttpResponse } from "msw";
import {
  authenticateRequest,
  invalidJsonResponse,
  internalServerErrorResponse,
} from "./utils";

interface TRPCRequestBody {
  id: number;
  path?: string;
  method?: string;
}

export const weightGetGoalsHandler = http.post(
  "/trpc/weight.getGoals",
  async ({ request }) => {
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonResponse("weight.getGoals");
    }

    const procedurePath = Array.isArray(requestBody)
      ? (requestBody[0] as TRPCRequestBody)?.path
      : (requestBody as TRPCRequestBody)?.path;

    if (procedurePath !== "weight.getGoals") {
      return; // Pass to next handler
    }

    const auth = authenticateRequest(request, "weight.getGoals");

    if (auth.response) {
      const body = await auth.response.json();
      if (body.length > 0) {
        body[0].id = 0; // this handler uses fixed id: 0
      }
      return HttpResponse.json(body, { status: auth.response.status || 200 });
    }

    const { userId } = auth;

    if (userId === "test-user-id") {
      return HttpResponse.json(
        [
          {
            id: 0,
            result: {
              type: "data",
              data: [
                {
                  id: "1",
                  goalWeightKg: 65.0,
                  goalSetAt: "2025-08-28T00:00:00Z",
                  reachedAt: null,
                },
                {
                  id: "2",
                  goalWeightKg: 70.0,
                  goalSetAt: "2025-08-27T00:00:00Z",
                  reachedAt: "2025-08-27T12:00:00Z",
                },
              ],
            },
          },
        ],
        { status: 200 },
      );
    }

    if (userId === "empty-user-id") {
      return HttpResponse.json(
        [{ id: 0, result: { type: "data", data: [] } }],
        { status: 200 },
      );
    }

    if (userId === "error-user-id") {
      const errorResponse = internalServerErrorResponse(
        "Failed to fetch goals",
        "weight.getGoals",
      );

      // Patch the fixed id (this handler always uses 0)
      const errorBody = await errorResponse.json();
      if (errorBody.length > 0) {
        errorBody[0].id = 0;
      }

      return HttpResponse.json(errorBody, { status: 200 });
    }

    if (userId === "invalid-user-id") {
      // Optional: treat as token invalid even though JWT verified
      return invalidJsonResponse("weight.getGoals");
      // or return invalidTokenResponse("weight.getGoals");
    }

    // No fallback unauthorized here anymore — we trust the token
    // If you reach here → it's a valid user we don't have special mock data for → return empty or default
    return HttpResponse.json(
      [{ id: 0, result: { type: "data", data: [] } }],
      { status: 200 },
    );
  },
);