// __mocks__/handlers/utils.ts
import { HttpResponse } from "msw";
import jwt from "jsonwebtoken";

// ──────────────────────────────────────────────────────────────
// Shared tRPC error shape — used across all error responses
// ──────────────────────────────────────────────────────────────

type TrpcErrorResponse = {
  id: number;
  error: {
    message: string;
    code: number;
    data: {
      code: string;
      httpStatus: number;
      path: string;
    };
  };
};

export type TrpcErrorBody = TrpcErrorResponse[];

// ──────────────────────────────────────────────────────────────
// Auth result type — used by authenticateRequest
// ──────────────────────────────────────────────────────────────

export interface AuthResult {
  userId: string | null;
  response?: HttpResponse<TrpcErrorBody>;
}

// ──────────────────────────────────────────────────────────────
// Reusable authentication logic for protected handlers
// ──────────────────────────────────────────────────────────────

export function authenticateRequest(
  request: Request,
  path: string,
): AuthResult {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      userId: null,
      response: HttpResponse.json<TrpcErrorBody>(
        [
          {
            id: 0, // placeholder – caller should patch with real id if needed
            error: {
              message: "Unauthorized",
              code: -32001,
              data: {
                code: "UNAUTHORIZED",
                httpStatus: 401,
                path,
              },
            },
          },
        ],
        { status: 200 },
      ),
    };
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: string };

    return { userId: decoded.userId };
  } catch {
    return {
      userId: null,
      response: invalidTokenResponse(path),
    };
  }
}

// ──────────────────────────────────────────────────────────────
// Error response helpers — all typed correctly now
// ──────────────────────────────────────────────────────────────

export function unauthorizedResponse(path = "unknown"): HttpResponse<TrpcErrorBody> {
  return HttpResponse.json<TrpcErrorBody>(
    [
      {
        id: 0,
        error: {
          message: "Unauthorized: User must be logged in",
          code: -32001,
          data: {
            code: "UNAUTHORIZED",
            httpStatus: 401,
            path,
          },
        },
      },
    ],
    { status: 401 },
  );
}

export function invalidJsonResponse(path = "unknown"): HttpResponse<TrpcErrorBody> {
  return HttpResponse.json<TrpcErrorBody>(
    [
      {
        id: 0,
        error: {
          message: "Invalid request body",
          code: -32600,
          data: {
            code: "BAD_REQUEST",
            httpStatus: 400,
            path,
          },
        },
      },
    ],
    { status: 400 },
  );
}

export function invalidTokenResponse(path = "unknown"): HttpResponse<TrpcErrorBody> {
  return HttpResponse.json<TrpcErrorBody>(
    [
      {
        id: 0,
        error: {
          message: "Invalid token",
          code: -32001,
          data: {
            code: "UNAUTHORIZED",
            httpStatus: 401,
            path,
          },
        },
      },
    ],
    { status: 401 },
  );
}

export function badRequestResponse(
  message = "",
  path = "unknown",
): HttpResponse<TrpcErrorBody> {
  return HttpResponse.json<TrpcErrorBody>(
    [
      {
        id: 0,
        error: {
          message,
          code: -32001,
          data: {
            code: "BAD_REQUEST",
            httpStatus: 400,
            path,
          },
        },
      },
    ],
    { status: 400 },
  );
}

// ──────────────────────────────────────────────────────────────
// More error response helpers
// ──────────────────────────────────────────────────────────────

export function internalServerErrorResponse(
  message = "Internal server error",
  path = "unknown",
  errorCode = -32002,           // common tRPC internal error code
): HttpResponse<TrpcErrorBody> {
  return HttpResponse.json<TrpcErrorBody>(
    [
      {
        id: 0,   // handlers will usually patch this later
        error: {
          message,
          code: errorCode,
          data: {
            code: "INTERNAL_SERVER_ERROR",
            httpStatus: 500,
            path,
          },
        },
      },
    ],
    { status: 500 },
  );
}