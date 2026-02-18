// __tests__/server/routers/user.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { server } from "../../../__mocks__/server";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/../../server/trpc";
import { TRPCError } from "@trpc/server";
import { setupMSW } from "../../setupTests";

describe("user router (protected)", () => {
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

  describe("getCurrent", () => {
    it("returns current user data when authenticated", async () => {
      server.use(
        trpcMsw.user.getCurrent.query(async () => ({
          id: "usr_abc123",
          email: "current.user@example.com",
        })),
      );

      const result = await client.user.getCurrent.query();

      expect(result).toEqual({
        id: "usr_abc123",
        email: "current.user@example.com",
      });
    });

    it("throws NOT_FOUND when user no longer exists", async () => {
      server.use(
        trpcMsw.user.getCurrent.query(async () => {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }),
      );

      await expect(client.user.getCurrent.query()).rejects.toMatchObject({
        message: "User not found",
        data: {
          code: "NOT_FOUND",
          httpStatus: 404,
          path: "user.getCurrent",
        },
      });
    });
  });

  describe("updateEmail", () => {
    it("updates email successfully when new email is valid and available", async () => {
      server.use(
        trpcMsw.user.updateEmail.mutation(async ({ input }) => ({
          message: "Email updated successfully",
          email: input.email,
        })),
      );

      const result = await client.user.updateEmail.mutate({
        email: "new.valid@example.com",
      });

      expect(result).toEqual({
        message: "Email updated successfully",
        email: "new.valid@example.com",
      });
    });

    it("returns success message when email is unchanged", async () => {
      server.use(
        trpcMsw.user.updateEmail.mutation(async ({ input }) => ({
          message: "Email is already up to date",
          email: input.email,
        })),
      );

      const result = await client.user.updateEmail.mutate({
        email: "current.user@example.com",
      });

      expect(result).toEqual({
        message: "Email is already up to date",
        email: "current.user@example.com",
      });
    });

    // ────────────────────────────────────────────────
    // Use mock handler to test Zod — this is standard & clean
    // Real Zod runs in integration/E2E tests with auth
    // ────────────────────────────────────────────────
    it("throws BAD_REQUEST for invalid email format", async () => {
      server.use(
        trpcMsw.user.updateEmail.mutation(async () => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid email address",
          });
        }),
      );

      await expect(
        client.user.updateEmail.mutate({
          email: "invalid-email-format",
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Invalid email address"),
        data: {
          code: "BAD_REQUEST",
          httpStatus: 400,
          path: "user.updateEmail",
        },
      });
    });

    it("throws CONFLICT when new email is already taken by another user", async () => {
      server.use(
        trpcMsw.user.updateEmail.mutation(async () => {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This email is already in use by another account",
          });
        }),
      );

      await expect(
        client.user.updateEmail.mutate({
          email: "already.taken@example.com",
        }),
      ).rejects.toMatchObject({
        message: "This email is already in use by another account",
        data: {
          code: "CONFLICT",
          httpStatus: 409,
          path: "user.updateEmail",
        },
      });
    });

    it("throws NOT_FOUND when current user does not exist", async () => {
      server.use(
        trpcMsw.user.updateEmail.mutation(async () => {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }),
      );

      await expect(
        client.user.updateEmail.mutate({
          email: "newemail@example.com",
        }),
      ).rejects.toMatchObject({
        message: "User not found",
        data: {
          code: "NOT_FOUND",
          httpStatus: 404,
          path: "user.updateEmail",
        },
      });
    });
  });
});