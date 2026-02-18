// __tests__/server/routers/register.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { server } from "../../../__mocks__/server";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/../../server/trpc"; // adjust path to match your alias/setup
import { TRPCError } from "@trpc/server";
import { setupMSW } from "../../setupTests"; // adjust path if needed
import crypto from "node:crypto";

describe("register procedure", () => {
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

  it("registers a new user successfully", async () => {
    server.use(
      trpcMsw.register.mutation(async ({ input }) => {
        // Optional light input validation in test
        expect(input).toMatchObject({
          email: expect.any(String),
          password: expect.any(String),
        });
        expect(input.email).toContain("@");

        return {
          user: {
            id: "mock-user-id-123",
            email: input.email,
          },
          accessToken: "mock-jwt-access-token.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refreshToken: crypto.randomUUID(),
          message: "Registration successful! Please check your email to verify your account.",
        };
      }),
    );

    const result = await client.register.mutate({
      email: "newuser@example.com",
      password: "password123",
    });

    expect(result).toMatchObject({
      user: {
        id: expect.any(String),
        email: "newuser@example.com",
      },
      accessToken: expect.any(String),
      refreshToken: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
      message: "Registration successful! Please check your email to verify your account.",
    });
  });

  it("throws BAD_REQUEST for invalid email format", async () => {
    server.use(
      trpcMsw.register.mutation(async () => {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid email address",
        });
      }),
    );

    await expect(
      client.register.mutate({
        email: "not-an-email",
        password: "password123",
      }),
    ).rejects.toMatchObject({
      message: "Invalid email address",
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "register",
      },
    });
  });

  it("throws BAD_REQUEST for password too short", async () => {
    server.use(
      trpcMsw.register.mutation(async () => {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password must be at least 8 characters",
        });
      }),
    );

    await expect(
      client.register.mutate({
        email: "newuser@example.com",
        password: "short",
      }),
    ).rejects.toMatchObject({
      message: "Password must be at least 8 characters",
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "register",
      },
    });
  });

  it("throws CONFLICT when email is already registered", async () => {
    server.use(
      trpcMsw.register.mutation(async () => {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email is already registered",
        });
      }),
    );

    await expect(
      client.register.mutate({
        email: "existing@example.com",
        password: "password123",
      }),
    ).rejects.toMatchObject({
      message: "This email is already registered",
      data: {
        code: "CONFLICT",
        httpStatus: 409,
        path: "register",
      },
    });
  });
});