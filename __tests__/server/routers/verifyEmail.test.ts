// __tests__/server/routers/verifyEmail.test.ts

import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../__mocks__/server";
import { setupMSW } from "../../../__tests__/setupTests";

describe("verifyEmail", () => {
  setupMSW();

  const ENDPOINT = "/trpc/verifyEmail";
  const HEADERS = { "content-type": "application/json" };

  const mockSuccess = () =>
    HttpResponse.json([
      { id: 0, result: { data: { message: "Email verified successfully!" } } },
    ]);

  const mockError = (message: string, code: string, status: number) =>
    HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message,
            code: -32001,
            data: { code, httpStatus: status, path: "verifyEmail" },
          },
        },
      ],
      { status },
    );

  const verifyEmailRequest = (token: string) =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify([{ id: 0, json: { token } }]),
    });

  it("verifies email successfully", async () => {
    server.use(http.post(ENDPOINT, mockSuccess));

    const response = await verifyEmailRequest("valid-token");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body[0].result.data).toEqual({
      message: "Email verified successfully!",
    });
  });

  it("returns 401 for invalid token", async () => {
    server.use(
      http.post(ENDPOINT, () =>
        mockError("Invalid verification token", "UNAUTHORIZED", 401),
      ),
    );

    const response = await verifyEmailRequest("invalid-token");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body[0].error.message).toBe("Invalid verification token");
  });

  it("returns 400 when email is already verified", async () => {
    server.use(
      http.post(ENDPOINT, () =>
        mockError("Email already verified", "BAD_REQUEST", 400),
      ),
    );

    const response = await verifyEmailRequest("valid-token");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body[0].error.message).toBe("Email already verified");
  });
});
