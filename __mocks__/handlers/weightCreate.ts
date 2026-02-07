// __mocks__/handlers/weightCreate.ts
import { http, HttpResponse } from "msw";

export const weightCreateHandler = http.post(
  "/trpc/weight.create",
  async ({ request }) => {
    let body;
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
                path: "weight.create",
              },
            },
          },
        ],
        { status: 400 },
      );
    }

    const headers = Object.fromEntries(request.headers.entries());
    const input = (
      body as {
        [key: string]: { id?: number; weightKg?: number; note?: string };
      }
    )["0"];
    const id = input?.id ?? 0;
    const userId = headers["authorization"]?.split("Bearer ")[1];

    if (!userId) {
      return HttpResponse.json(
        [
          {
            id,
            error: {
              message: "Unauthorized: User must be logged in",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.create",
              },
            },
          },
        ],
        { status: 401 },
      );
    }
    if (!input?.weightKg || input.weightKg <= 0) {
      return HttpResponse.json(
        [
          {
            id,
            error: {
              message: "Weight must be a positive number",
              code: -32001,
              data: {
                code: "BAD_REQUEST",
                httpStatus: 400,
                path: "weight.create",
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
          data: {
            id: "weight-id-123",
            weightKg: input.weightKg,
            createdAt: new Date().toISOString(),
          },
        },
      },
    ]);
  },
);
