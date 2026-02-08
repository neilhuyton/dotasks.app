// __mocks__/handlers/weightCreate.ts
import { http, HttpResponse } from "msw";
import { badRequestResponse, unauthorizedResponse } from "./utils";

export const weightCreateHandler = http.post(
  "/trpc/weight.create",
  async ({ request }) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse("Invalid request body", "weight.create");
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
      return unauthorizedResponse("weight.create");
    }
    if (!input?.weightKg || input.weightKg <= 0) {
      return badRequestResponse(
        "Weight must be a positive number",
        "weight.create",
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
