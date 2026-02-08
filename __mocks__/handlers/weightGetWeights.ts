// __mocks__/handlers/weightGetWeights.ts
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

export const weightGetWeightsHandler = http.post(
  "/trpc/weight.getWeights",
  async ({ request }) => {
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return invalidJsonResponse("weight.getWeights");
    }

    const requests = Array.isArray(requestBody) ? requestBody : [requestBody];
    const weightsRequest = requests.find(
      (req: TRPCRequestBody) => req.path === "weight.getWeights",
    );

    if (!weightsRequest) {
      return; // Pass to other handlers if this isn't the requested procedure
    }

    // Use the reusable authentication helper
    const auth = authenticateRequest(request, "weight.getWeights");

    if (auth.response) {
      // Auth failed → patch the correct id and return the error response
      const body = await auth.response.json();
      if (body.length > 0) {
        body[0].id = weightsRequest.id;
      }
      return HttpResponse.json(body, { status: auth.response.status || 200 });
    }

    const { userId } = auth;

    // Special test cases
    if (userId === "error-user-id") {
      const errorResponse = internalServerErrorResponse(
        "Failed to fetch weights",
        "weight.getWeights",
      );

      // Patch the real request id into the error response
      const errorBody = await errorResponse.json();
      if (errorBody.length > 0) {
        errorBody[0].id = weightsRequest.id;
      }

      return HttpResponse.json(errorBody, { status: 200 });
    }

    if (userId === "empty-user-id") {
      return HttpResponse.json(
        [
          {
            id: weightsRequest.id,
            result: { type: "data", data: [] },
          },
        ],
        { status: 200 },
      );
    }

    // Normal success case with mock data
    const mockWeights = [
      { id: "1", weightKg: 70, createdAt: "2023-10-01T00:00:00Z", note: "" },
      {
        id: "2",
        weightKg: 69.9,
        createdAt: "2023-10-02T00:00:00Z",
        note: "Morning",
      },
    ];

    return HttpResponse.json(
      [
        {
          id: weightsRequest.id,
          result: {
            type: "data",
            data: mockWeights,
          },
        },
      ],
      { status: 200 },
    );
  },
);