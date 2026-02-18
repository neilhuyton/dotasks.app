// __tests__/server/routers/login.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { server } from "../../../__mocks__/server";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/../../server/trpc"; // adjust path to match your alias/setup
import { TRPCError } from "@trpc/server";
import { setupMSW } from "../../setupTests"; // adjust path if needed

describe("login procedure", () => {
  setupMSW();

  const client = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: "http://localhost:8888/trpc",
      }),
    ],
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("logs in a user successfully", async () => {
    server.use(
      trpcMsw.login.mutation(async ({ input }) => {
        // Optional: light input shape check
        expect(input).toMatchObject({
          email: expect.any(String),
          password: expect.any(String),
        });

        return {
          user: {
            id: "test-user-id",
            email: input.email,
          },
          accessToken: "mock-jwt-access-token.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refreshToken: "550e8400-e29b-41d4-a716-446655440000",
          message: "Login successful",
        };
      }),
    );

    const result = await client.login.mutate({
      email: "testuser@example.com",
      password: "password123",
    });

    expect(result).toMatchObject({
      user: {
        id: expect.any(String),
        email: "testuser@example.com",
      },
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      message: expect.stringContaining("successful"),
    });
  });

  it("throws UNAUTHORIZED for invalid credentials", async () => {
    server.use(
      trpcMsw.login.mutation(async () => {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }),
    );

    await expect(
      client.login.mutate({
        email: "wronguser@example.com",
        password: "wrongpassword",
      }),
    ).rejects.toMatchObject({
      message: "Invalid email or password",
      data: {
        code: "UNAUTHORIZED",
        httpStatus: 401,
        path: "login",
      },
    });
  });

  it("throws UNAUTHORIZED when email is not verified", async () => {
    server.use(
      trpcMsw.login.mutation(async () => {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Please verify your email before logging in",
        });
      }),
    );

    await expect(
      client.login.mutate({
        email: "unverified@example.com",
        password: "password123",
      }),
    ).rejects.toMatchObject({
      message: "Please verify your email before logging in",
      data: {
        code: "UNAUTHORIZED",
        httpStatus: 401,
        path: "login",
      },
    });
  });
});