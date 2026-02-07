import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../__mocks__/server";
import { setupMSW } from "../../../__tests__/setupTests";

describe("login", () => {
  setupMSW();

  const ENDPOINT = "/trpc/login";
  const HEADERS = { "content-type": "application/json" } as const;

  const mockSuccess = (data: { id: string; email: string }) =>
    HttpResponse.json([{ id: 0, result: { data } }]);

  const mockError = (message: string, status: number = 401) =>
    HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message,
            code: -32001,
            data: { code: "UNAUTHORIZED", httpStatus: status, path: "login" },
          },
        },
      ],
      { status },
    );

  const loginRequest = (payload: { email: string; password: string }) =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify([{ id: 0, json: payload }]),
    });

  it("logs in a user successfully", async () => {
    const successUser = { id: "test-user-id", email: "testuser@example.com" };

    server.use(http.post(ENDPOINT, () => mockSuccess(successUser)));

    const response = await loginRequest({
      email: "testuser@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body[0].result.data).toEqual(successUser);
  });

  it("returns 401 for invalid credentials", async () => {
    server.use(
      http.post(ENDPOINT, () => mockError("Invalid email or password")),
    );

    const response = await loginRequest({
      email: "wronguser@example.com",
      password: "wrongpassword",
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body[0].error.message).toBe("Invalid email or password");
  });

  it("returns 401 when email is not verified", async () => {
    server.use(
      http.post(ENDPOINT, () =>
        mockError("Please verify your email before logging in"),
      ),
    );

    const response = await loginRequest({
      email: "unverified@example.com",
      password: "password123",
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body[0].error.message).toBe(
      "Please verify your email before logging in",
    );
  });
});
