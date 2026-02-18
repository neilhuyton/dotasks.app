// __tests__/server/routers/verifyEmail.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { server } from "../../../__mocks__/server";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/../../server/trpc"; // ← your exact import path
import { TRPCError } from "@trpc/server";
import { setupMSW } from "../../setupTests";

describe("verifyEmail procedure", () => {
  setupMSW();

  // Absolute localhost URL — required in pure Node/Vitest (no browser origin)
  // MSW intercepts requests to /trpc regardless of host/port
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

  it("verifies email successfully with valid token", async () => {
    server.use(
      trpcMsw.verifyEmail.mutation(async ({ input }) => {
        expect(input.token).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );

        return {
          message: "Email verified successfully! You can now log in.",
          email: "user@example.com",
        };
      }),
    );

    const result = await client.verifyEmail.mutate({
      token: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result).toEqual({
      message: "Email verified successfully! You can now log in.",
      email: "user@example.com",
    });
  });

  it("throws NOT_FOUND for invalid or expired token", async () => {
    server.use(
      trpcMsw.verifyEmail.mutation(async () => {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired verification token.",
        });
      }),
    );

    await expect(
      client.verifyEmail.mutate({ token: "invalid-token" }),
    ).rejects.toMatchObject({
      message: "Invalid or expired verification token.",
      data: {
        code: "NOT_FOUND",
        httpStatus: 404,
        path: "verifyEmail",
      },
    });
  });

  it("throws BAD_REQUEST when email is already verified", async () => {
    server.use(
      trpcMsw.verifyEmail.mutation(async () => {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email is already verified.",
        });
      }),
    );

    await expect(
      client.verifyEmail.mutate({ token: "already-used-token" }),
    ).rejects.toMatchObject({
      message: "Email is already verified.",
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "verifyEmail",
      },
    });
  });

  it("enforces UUID format validation via Zod", async () => {
    await expect(
      client.verifyEmail.mutate({ token: "not-a-uuid" }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("Invalid verification token format"),
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "verifyEmail",
      },
    });
  });

  it("handles already-used token with specific message", async () => {
    server.use(
      trpcMsw.verifyEmail.mutation(async () => {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This verification link has already been used or the email is verified.",
        });
      }),
    );

    await expect(
      client.verifyEmail.mutate({ token: "used-token" }),
    ).rejects.toMatchObject({
      message:
        "This verification link has already been used or the email is verified.",
      data: { code: "BAD_REQUEST" },
    });
  });
});
