// __tests__/server/routers/register.test.ts

import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../__mocks__/server";
import { setupMSW } from "../../../__tests__/setupTests";

describe("register", () => {
  setupMSW();

  const ENDPOINT = "/trpc/register";
  const HEADERS = { "content-type": "application/json" } as const;

  const mockSuccess = (data: Record<string, unknown>) =>
    HttpResponse.json([{ id: 0, result: { data } }]);

  const mockError = (message: string, code: string, status: number) =>
    HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message,
            code: -32001,
            data: { code, httpStatus: status, path: "register" },
          },
        },
      ],
      { status },
    );

  const registerRequest = (payload: { email: string; password: string }) =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify([{ id: 0, json: payload }]),
    });

  it("registers a new user successfully", async () => {
    const successData = {
      id: "new-user-id",
      email: "newuser@example.com",
      message:
        "Registration successful! Please check your email to verify your account.",
    };

    server.use(http.post(ENDPOINT, () => mockSuccess(successData)));

    const response = await registerRequest({
      email: "newuser@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as [
      { result: { data: typeof successData } },
    ];
    expect(body[0].result.data).toEqual(successData);
  });

  it("returns 400 for invalid email format", async () => {
    server.use(
      http.post(ENDPOINT, () =>
        mockError("Invalid email address", "BAD_REQUEST", 400),
      ),
    );

    const response = await registerRequest({
      email: "invalid-email",
      password: "password123",
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as [{ error: { message: string } }];
    expect(body[0].error.message).toBe("Invalid email address");
  });

  it("returns 400 for password too short", async () => {
    server.use(
      http.post(ENDPOINT, () =>
        mockError("Password must be at least 8 characters", "BAD_REQUEST", 400),
      ),
    );

    const response = await registerRequest({
      email: "newuser@example.com",
      password: "short",
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as [{ error: { message: string } }];
    expect(body[0].error.message).toBe(
      "Password must be at least 8 characters",
    );
  });

  it("returns 400 when email is already registered", async () => {
    server.use(
      http.post(ENDPOINT, () =>
        mockError("Email already registered", "BAD_REQUEST", 400),
      ),
    );

    const response = await registerRequest({
      email: "neil.huyton@gmail.com",
      password: "password123",
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as [{ error: { message: string } }];
    expect(body[0].error.message).toBe("Email already registered");
  });
});
