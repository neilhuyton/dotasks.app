// __mocks__/handlers/catchAll.ts
import { http, HttpResponse } from "msw";

export const catchAllHandler = http.post(
  "/trpc/:procedure",
  async ({ request, params }) => {
    let body;
    try {
      body = await request.json(); // Read body directly from original request
      console.log("tRPC Fetch Body:", body);
    } catch (error) {
      console.error("Error parsing request body:", error);
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
                path: params.procedure ?? "unknown",
              },
            },
          },
        ],
        { status: 400 },
      );
    }

    const query = (body as { [key: string]: { path: string } })["0"];
    const path = query?.path || params.procedure || "unknown";
    const id = (body as { [key: string]: { id?: number } })["0"]?.id ?? 0;
    const authHeader = request.headers.get("Authorization");
    const userId = authHeader?.match(/test-user-id/)
      ? "test-user-id"
      : authHeader?.match(/empty-user-id/)
        ? "empty-user-id"
        : authHeader?.match(/error-user-id/)
          ? "error-user-id"
          : null;

    console.log(
      "tRPC Fetch Headers:",
      Object.fromEntries(request.headers.entries()),
    );
    console.log("User ID:", userId);

    // Handle invalid batched procedure paths
    const procedure = params.procedure ?? ""; // Fallback to empty string
    if (procedure.includes(",")) {
      return HttpResponse.json(
        [
          {
            id,
            error: {
              message: `Invalid procedure path: ${procedure}`,
              code: -32601,
              data: { code: "NOT_FOUND", httpStatus: 404, path: procedure },
            },
          },
        ],
        { status: 404 },
      );
    }

    // Handle specific test cases for weight.getWeights
    if (path === "weight.getWeights") {
      if (userId === "test-user-id") {
        // Successful response with weight data
        return HttpResponse.json(
          [
            {
              id,
              result: {
                data: [
                  { id: 1, weight: 70, date: "2025-08-01", goal: 65 },
                  { id: 2, weight: 69, date: "2025-08-02", goal: 65 },
                ],
              },
            },
          ],
          { status: 200 },
        );
      } else if (userId === "empty-user-id") {
        // Empty weights response
        return HttpResponse.json(
          [
            {
              id,
              result: {
                data: [],
              },
            },
          ],
          { status: 200 },
        );
      } else if (userId === "error-user-id") {
        // Error response
        return HttpResponse.json(
          [
            {
              id,
              error: {
                message: "Failed to fetch weights",
                code: -32000,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
              },
            },
          ],
          { status: 500 },
        );
      }
    }

    // Default fallback for unhandled cases
    return HttpResponse.json(
      [
        {
          id,
          error: {
            message: "Procedure not found",
            code: -32601,
            data: { code: "NOT_FOUND", httpStatus: 404, path },
          },
        },
      ],
      { status: 404 },
    );
  },
);
