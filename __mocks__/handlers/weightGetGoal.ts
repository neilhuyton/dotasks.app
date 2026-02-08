// __mocks__/handlers/weightGetGoal.ts
import { http, HttpResponse } from "msw";
import { invalidJsonResponse } from "./utils";

export const weightGetGoalHandler = http.post(
  "/trpc/weight.getGoal",
  async ({ request }) => {
    const headers = Object.fromEntries(request.headers.entries());
    const userId = headers["authorization"]?.split("Bearer ")[1];
    if (!userId) {
      return invalidJsonResponse('weight.getGoal')
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
