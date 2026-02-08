import { HttpResponse } from "msw";
import jwt from "jsonwebtoken";

// ────────────────────────────────────────────────
// Common tRPC error shape (matches your original style)
interface TrpcErrorResponse {
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
}

// ────────────────────────────────────────────────
// Helper to create consistent error responses
function createErrorResponse(
  id: number,
  message: string,
  code: string,
  httpStatus: number,
  path: string,
): TrpcErrorResponse {
  return {
    id,
    error: {
      message,
      code: -32001,  // your original code used this for most errors
      data: { code, httpStatus, path },
    },
  };
}

// ────────────────────────────────────────────────
// Parse JSON body or return BAD_REQUEST response
export async function parseBodyOr400(
  request: Request,
  path: string,
): Promise<unknown | Response> {
  let body: unknown;
  try {
    body = await request.json();
    return body;
  } catch {
    return HttpResponse.json(
      [createErrorResponse(0, "Invalid request body", "BAD_REQUEST", 400, path)],
      { status: 400 },
    );
  }
}

// ────────────────────────────────────────────────
// Extract id & input from common tRPC body shapes
export function extractIdAndInput<T = unknown>(
  body: unknown,
): { id: number; input: T | undefined } {
  let id = 0;
  let input: T | undefined = undefined;

  if (Array.isArray(body) && body.length > 0) {
    const first = body[0];
    if (first && typeof first === "object") {
      id = Number((first as { id?: unknown }).id) || 0;
      input = (first as { input?: T }).input;
    }
  } else if (body && typeof body === "object" && !Array.isArray(body)) {
    if ("id" in body) id = Number((body as { id?: unknown }).id) || 0;
    if ("input" in body) input = (body as { input?: T }).input;
  }

  return { id, input };
}

// ────────────────────────────────────────────────
// Validate Bearer token or return 401 response
export function validateBearerOr401(
  request: Request,
  path: string,
  id: number = 0,
): Response | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return HttpResponse.json(
      [createErrorResponse(id, "Unauthorized: User must be logged in", "UNAUTHORIZED", 401, path)],
      { status: 401 },
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    return null;
  } catch {
    return HttpResponse.json(
      [createErrorResponse(id, "Invalid token", "UNAUTHORIZED", 401, path)],
      { status: 401 },
    );
  }
}

// ────────────────────────────────────────────────
// Create success tRPC batch response
export function successResponse<T>(id: number, data: T): Response {
  return HttpResponse.json(
    [{
      id,
      result: {
        type: "data",
        data,
      },
    }],
    { status: 200 },
  );
}