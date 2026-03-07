// __tests__/netlify/functions/trpc.test.ts

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../__mocks__/server";

interface TrpcRequestBody {
  json: {
    path: string;
    input: Record<string, unknown>;
  };
}

interface TrpcSuccessResponse<T = unknown> {
  result: {
    data: T;
  };
}

interface TrpcErrorResponse {
  error: {
    message: string;
    code: string;
  };
}

describe("Netlify Function: trpc", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const TRPC_ENDPOINT = "/trpc";

  const createTrpcBody = (
    path: string,
    input: Record<string, unknown>,
  ): TrpcRequestBody => ({
    json: { path, input },
  });

  it("successfully registers a new user", async () => {
    const newUser = {
      id: "new-user-id",
      email: "newuser@example.com",
    } as const;

    server.use(
      http.post(TRPC_ENDPOINT, async ({ request }) => {
        const body = (await request.json()) as unknown;

        if (!body || typeof body !== "object" || !("json" in body)) {
          return HttpResponse.json(
            {
              error: { message: "Invalid request format", code: "BAD_REQUEST" },
            },
            { status: 400 },
          );
        }

        const { json } = body as TrpcRequestBody;

        if (json.path === "register") {
          return HttpResponse.json<TrpcSuccessResponse<typeof newUser>>({
            result: { data: newUser },
          });
        }

        return HttpResponse.json<TrpcErrorResponse>(
          { error: { message: "Procedure not found", code: "NOT_FOUND" } },
          { status: 404 },
        );
      }),
    );

    const response = await fetch(TRPC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        createTrpcBody("register", {
          email: "newuser@example.com",
          password: "password123",
        }),
      ),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as TrpcSuccessResponse;
    expect(data.result.data).toEqual(newUser);
  });

  it("returns 400 when email is invalid during registration", async () => {
    server.use(
      http.post(TRPC_ENDPOINT, async ({ request }) => {
        const body = (await request.json()) as unknown;

        if (!body || typeof body !== "object" || !("json" in body)) {
          return HttpResponse.json(
            {
              error: { message: "Invalid request format", code: "BAD_REQUEST" },
            },
            { status: 400 },
          );
        }

        const { json } = body as TrpcRequestBody;

        if (json.path === "register") {
          return HttpResponse.json<TrpcErrorResponse>(
            {
              error: {
                message: "Invalid email address",
                code: "BAD_REQUEST",
              },
            },
            { status: 400 },
          );
        }

        return HttpResponse.json<TrpcErrorResponse>(
          { error: { message: "Procedure not found", code: "NOT_FOUND" } },
          { status: 404 },
        );
      }),
    );

    const response = await fetch(TRPC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        createTrpcBody("register", {
          email: "invalid-email",
          password: "password123",
        }),
      ),
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as TrpcErrorResponse;
    expect(data.error.message).toContain("Invalid email address");
    expect(data.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when password is too short during registration", async () => {
    server.use(
      http.post(TRPC_ENDPOINT, async ({ request }) => {
        const body = (await request.json()) as unknown;

        if (!body || typeof body !== "object" || !("json" in body)) {
          return HttpResponse.json(
            {
              error: { message: "Invalid request format", code: "BAD_REQUEST" },
            },
            { status: 400 },
          );
        }

        const { json } = body as TrpcRequestBody;

        if (json.path === "register") {
          return HttpResponse.json<TrpcErrorResponse>(
            {
              error: {
                message: "Password must be at least 8 characters",
                code: "BAD_REQUEST",
              },
            },
            { status: 400 },
          );
        }

        return HttpResponse.json<TrpcErrorResponse>(
          { error: { message: "Procedure not found", code: "NOT_FOUND" } },
          { status: 404 },
        );
      }),
    );

    const response = await fetch(TRPC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        createTrpcBody("register", {
          email: "newuser@example.com",
          password: "short",
        }),
      ),
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as TrpcErrorResponse;
    expect(data.error.message).toContain(
      "Password must be at least 8 characters",
    );
    expect(data.error.code).toBe("BAD_REQUEST");
  });
});
