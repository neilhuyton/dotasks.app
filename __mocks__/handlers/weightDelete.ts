// __mocks__/handlers/weightDelete.ts
import { http, HttpResponse } from "msw";
import {
  authenticateRequest,
  badRequestResponse,
  internalServerErrorResponse,
} from "./utils";
import { weights } from "./weightsData"; // shared weights array

interface TrpcInput {
  weightId: string;
  id?: number;
}

export const weightDeleteHandler = http.post(
  "/trpc/weight.delete",
  async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse("Invalid request body", "weight.delete");
    }

    // Safely extract the tRPC input object
    const inputObj = body && typeof body === "object" && "0" in body
      ? (body as { [key: string]: TrpcInput | undefined })["0"]
      : undefined;

    const requestId = inputObj?.id ?? 0;

    // Reusable authentication
    const auth = authenticateRequest(request, "weight.delete");

    if (auth.response) {
      const errorBody = await auth.response.json();
      if (errorBody.length > 0) {
        errorBody[0].id = requestId;
      }
      return HttpResponse.json(errorBody, { status: auth.response.status || 200 });
    }

    const { userId } = auth;

    // Special test cases
    if (userId === "error-user-id") {
      const errorResponse = internalServerErrorResponse(
        "Failed to delete weight",
        "weight.delete",
      );

      // Patch the real request id
      const errorBody = await errorResponse.json();
      if (errorBody.length > 0) {
        errorBody[0].id = requestId;
      }

      return HttpResponse.json(errorBody, { status: 200 });
    }

    if (!inputObj || !inputObj.weightId) {
      return badRequestResponse("Invalid input: weightId is required", "weight.delete");
    }

    const weightIndex = weights.findIndex((w) => w.id === inputObj.weightId);

    if (weightIndex !== -1) {
      weights.splice(weightIndex, 1);
      return HttpResponse.json(
        [
          {
            id: requestId,
            result: {
              data: { id: inputObj.weightId },
            },
          },
        ],
        { status: 200 },
      );
    }

    return HttpResponse.json(
      [
        {
          id: requestId,
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