// __mocks__/handlers/trpc-handler-utils.ts
import { HttpResponse } from "msw";
import jwt from "jsonwebtoken";

interface TrpcErrorData {
  code: string;
  httpStatus: number;
  path: string;
}

export interface TrpcError {
  id: number;
  error: {
    message: string;
    code: number;
    data: TrpcErrorData;
  };
}

export interface TrpcSuccess<T> {
  id: number;
  result: {
    type: "data";
    data: T;
  };
}

export type TrpcBatchResponse<T = unknown> = Array<TrpcError | TrpcSuccess<T>>;

export function createTrpcError(
  id: number,
  message: string,
  errorCode: string,
  httpStatus: number,
  path: string,
): TrpcError {
  return {
    id,
    error: {
      message,
      code: -32000,
      data: {
        code: errorCode,
        httpStatus,
        path,
      },
    },
  };
}

export interface ParsedTrpcBodyResult<Input> {
  requestId: number;
  input: Input | undefined;
  errorResponse?: TrpcBatchResponse;
}

export async function parseTrpcBody<Input>(
  request: Request,
  path: string,
): Promise<ParsedTrpcBodyResult<Input>> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return {
      requestId: 0,
      input: undefined,
      errorResponse: [
        createTrpcError(
          0,
          "Invalid request body — expected JSON",
          "BAD_REQUEST",
          400,
          path,
        ),
      ],
    };
  }

  let requestId = 0;
  let input: Input | undefined = undefined;

  if (Array.isArray(rawBody) && rawBody.length > 0) {
    const first = rawBody[0];
    if (
      first &&
      typeof first === "object" &&
      "id" in first &&
      "input" in first
    ) {
      requestId = Number(first.id) || 0;
      input = first.input as Input | undefined;
    }
  } else if (
    rawBody &&
    typeof rawBody === "object" &&
    !Array.isArray(rawBody)
  ) {
    if ("id" in rawBody && "input" in rawBody) {
      requestId = Number((rawBody as { id: unknown }).id) || 0;
      input = (rawBody as { input?: Input }).input;
    }
  }

  return { requestId, input, errorResponse: undefined };
}

export function authenticateRequest(
  request: Request,
  path: string,
  requestId: number = 0,
): TrpcError | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return createTrpcError(
      requestId,
      "Unauthorized: Bearer token required",
      "UNAUTHORIZED",
      401,
      path,
    );
  }

  const token = authHeader.split(" ")[1]!;

  try {
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    return null;
  } catch {
    return createTrpcError(
      requestId,
      "Invalid or expired token",
      "UNAUTHORIZED",
      401,
      path,
    );
  }
}

export function respondWithTrpcBatch<T>(
  responses: TrpcBatchResponse<T>,
  status = 200,
): Response {
  return HttpResponse.json(responses, { status });
}

export function successResponse<T>(id: number, data: T): TrpcSuccess<T> {
  return {
    id,
    result: {
      type: "data",
      data,
    },
  };
}
