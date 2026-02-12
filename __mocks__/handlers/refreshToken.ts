// __mocks__/handlers/refreshToken.ts

import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";
import {
  internalServerErrorResponse,
} from "./utils"; // assuming internalServerErrorResponse is exported from utils.ts
import { mockUsers, type MockUser } from "../mockUsers";

interface TRPCRequestBody {
  "0": {
    json: {
      refreshToken: string;
    };
  };
}

export const refreshTokenHandler = http.post(
  "/trpc/refreshToken.refresh",
  async ({ request }) => {
    try {
      const body = (await request.json()) as TRPCRequestBody;
      const { refreshToken } = body["0"].json;

      const user = mockUsers.find(
        (u: MockUser) => u.refreshToken === refreshToken,
      );

      if (user) {
        const newToken = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET || "your-secret-key",
          { expiresIn: "1h" },
        );
        return HttpResponse.json(
          [
            {
              id: 0,
              result: {
                type: "data",
                data: {
                  token: newToken,
                  refreshToken: "new-mock-refresh-token",
                },
              },
            },
          ],
          { status: 200 },
        );
      }

      // Invalid refresh token
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid refresh token",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path: "refreshToken.refresh",
              },
            },
          },
        ],
        { status: 200 },
      );
    } catch {
      // Use the reusable internal server error helper
      const errorResponse = internalServerErrorResponse(
        "Internal server error",
        "refreshToken.refresh",
      );

      // Since this handler always uses id: 0, we can patch it directly
      const errorBody = await errorResponse.json();
      if (errorBody.length > 0) {
        errorBody[0].id = 0;
      }

      return HttpResponse.json(errorBody, { status: 200 });
    }
  },
);