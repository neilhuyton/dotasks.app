// __mocks__/handlers/weightGetWeights.ts
import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";

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
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid request body",
              code: -32000,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "weight.getWeights",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    const requests = Array.isArray(requestBody) ? requestBody : [requestBody];
    const weightsRequest = requests.find(
      (req: TRPCRequestBody) => req.path === "weight.getWeights",
    );

    if (!weightsRequest) {
      return; // Pass to other handlers
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json(
        [
          {
            id: weightsRequest.id,
            error: {
              message: "Unauthorized",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.getWeights",
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
            id: weightsRequest.id,
            error: {
              message: "Invalid token",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.getWeights",
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
            id: weightsRequest.id,
            error: {
              message: "Failed to fetch weights",
              code: -32002,
              data: {
                code: "INTERNAL_SERVER_ERROR",
                httpStatus: 500,
                path: "weight.getWeights",
              },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (userId === "empty-user-id") {
      return HttpResponse.json(
        [{ id: weightsRequest.id, result: { type: "data", data: [] } }],
        { status: 200 },
      );
    }

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
      [{ id: weightsRequest.id, result: { type: "data", data: mockWeights } }],
      { status: 200 },
    );
  },
);
