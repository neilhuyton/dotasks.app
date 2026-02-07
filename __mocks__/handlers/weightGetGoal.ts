// __mocks__/handlers/weightGetGoal.ts
import { http, HttpResponse } from "msw";

export const weightGetGoalHandler = http.post(
  "/trpc/weight.getGoal",
  async ({ request }) => {
    const headers = Object.fromEntries(request.headers.entries());
    const userId = headers["authorization"]?.split("Bearer ")[1];
    if (!userId) {
      return HttpResponse.json(
        [
          {
            error: {
              message: "Unauthorized: User must be logged in",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "weight.getGoal",
              },
            },
          },
        ],
        { status: 401 },
      );
    }
    return HttpResponse.json([
      {
        result: {
          data: { goalWeightKg: 65.0 },
        },
      },
    ]);
  },
);
