// mocks/handlers/trpc-utils.ts
import { HttpResponse, http, type HttpResponseResolver } from 'msw'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// ────────────────────────────────────────────────
// tRPC response shapes
// ────────────────────────────────────────────────

export interface TrpcErrorData {
  code: string
  httpStatus: number
  path: string
  [key: string]: unknown
}

export interface TrpcError {
  id: number
  error: {
    message: string
    code: number
    data: TrpcErrorData
  }
}

export interface TrpcSuccess<T> {
  id: number
  result: {
    type: 'data'
    data: T
  }
}

export type TrpcResponse<T = unknown> = Array<TrpcError | TrpcSuccess<T>>

// ────────────────────────────────────────────────
// Response builders
// ────────────────────────────────────────────────

export function trpcError(
  id: number,
  message: string,
  errorCode: string,
  httpStatus: number,
  path: string,
  extraData: Record<string, unknown> = {},
): TrpcResponse<never> {
  return [
    {
      id,
      error: {
        message,
        code: -32000 + (httpStatus - 400),
        data: {
          code: errorCode,
          httpStatus,
          path,
          ...extraData,
        },
      },
    },
  ]
}

export function trpcSuccess<T>(id: number, data: T): TrpcResponse<T> {
  return [
    {
      id,
      result: {
        type: 'data',
        data,
      },
    },
  ]
}

export const trpcBadRequest = (
  id: number,
  message: string,
  path: string,
): TrpcResponse<never> => trpcError(id, message, 'BAD_REQUEST', 400, path)

export const trpcUnauthorized = (
  id: number,
  path: string,
): TrpcResponse<never> => trpcError(id, 'Unauthorized', 'UNAUTHORIZED', 401, path)

export const trpcInvalidToken = (
  id: number,
  path: string,
): TrpcResponse<never> => trpcError(id, 'Invalid token', 'UNAUTHORIZED', 401, path)

export const trpcNotFound = (
  id: number,
  message: string,
  path: string,
): TrpcResponse<never> => trpcError(id, message, 'NOT_FOUND', 404, path)

export const trpcServerError = (
  id: number,
  message: string,
  path: string,
): TrpcResponse<never> => trpcError(id, message, 'INTERNAL_SERVER_ERROR', 500, path)

// ────────────────────────────────────────────────
// Request parsing helpers
// ────────────────────────────────────────────────

interface TrpcSingleRequest<Input = unknown> {
  id?: number
  input?: Input
  path?: string
}

interface TrpcBatchRequestItem<Input = unknown> {
  id?: number
  input?: Input
  path?: string
}

export interface ParsedTrpcRequest<Input = unknown> {
  id: number
  input: Input | undefined
  path: string | undefined
}

export function parseTrpcBody<Input = unknown>(
  rawBody: unknown,
): ParsedTrpcRequest<Input> | null {
  if (!rawBody || typeof rawBody !== 'object') {
    return null
  }

  // Classic batch format: [{ id, input, path? }, ...]
  if (Array.isArray(rawBody) && rawBody.length > 0) {
    const first = rawBody[0] as TrpcBatchRequestItem<Input> | undefined
    if (!first) return null
    return {
      id: first.id ?? 0,
      input: first.input,
      path: first.path,
    }
  }

  // Single request: { id?, input?, path? }
  if ('input' in rawBody || 'id' in rawBody || 'path' in rawBody) {
    const req = rawBody as TrpcSingleRequest<Input>
    return {
      id: req.id ?? 0,
      input: req.input,
      path: req.path,
    }
  }

  // Client sends { "0": { goalId: "1", goalWeightKg: 60 } } — flat, no "input" wrapper
  if ('0' in rawBody) {
    const inner = (rawBody as Record<string, any>)['0']
    if (inner && typeof inner === 'object') {
      // Use the inner object directly as input if no "input" key exists
      const actualInput = 'input' in inner ? inner.input : inner
      return {
        id: inner.id ?? 0,
        input: actualInput,
        path: inner.path,
      }
    }
  }

  return null
}

// ────────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────────

export type AuthResult =
  | { kind: 'ok'; userId: string }
  | { kind: 'missing' }
  | { kind: 'invalid' }

export async function getUserIdFromRequest(
  request: Parameters<HttpResponseResolver>[0]['request']
): Promise<AuthResult> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return { kind: 'missing' }
  }

  const token = auth.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
    if (!payload.userId) throw new Error('No userId in token')
    return { kind: 'ok', userId: payload.userId }
  } catch {
    return { kind: 'invalid' }
  }
}

// ────────────────────────────────────────────────
// Response helper
// ────────────────────────────────────────────────

export function respondWithTrpcJson<T>(
  response: TrpcResponse<T>,
  httpStatus = 200,
): Response {
  return HttpResponse.json(response, { status: httpStatus })
}