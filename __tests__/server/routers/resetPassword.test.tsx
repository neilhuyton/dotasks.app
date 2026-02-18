// __tests__/server/routers/resetPassword.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { server } from "../../../__mocks__/server";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/../../server/trpc"; // adjust path to match your alias
import { TRPCError } from "@trpc/server";
import { setupMSW } from "../../setupTests"; // adjust path if needed

describe("resetPassword router (public procedures)", () => {
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

  describe("request (request reset)", () => {
    it("sends reset link for existing email (success message always)", async () => {
      server.use(
        trpcMsw.resetPassword.request.mutation(async ({ input }) => {
          expect(input.email).toBe("existing@example.com");
          return {
            message: "If an account with this email exists, a reset link has been sent.",
          };
        }),
      );

      const result = await client.resetPassword.request.mutate({
        email: "existing@example.com",
      });

      expect(result).toEqual({
        message: "If an account with this email exists, a reset link has been sent.",
      });
    });

    it("returns same success message even if email does not exist (anti-enumeration)", async () => {
      server.use(
        trpcMsw.resetPassword.request.mutation(async () => {
          return {
            message: "If an account with this email exists, a reset link has been sent.",
          };
        }),
      );

      const result = await client.resetPassword.request.mutate({
        email: "nonexistent@example.com",
      });

      expect(result).toEqual({
        message: "If an account with this email exists, a reset link has been sent.",
      });
    });

    it("throws BAD_REQUEST for invalid email format (real Zod)", async () => {
      await expect(
        client.resetPassword.request.mutate({
          email: "not-an-email",
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Invalid email address"),
        data: {
          code: "BAD_REQUEST",
          httpStatus: 400,
          path: "resetPassword.request",
        },
      });
    });
  });

  describe("confirm (reset password with token)", () => {
    it("resets password successfully with valid token", async () => {
      server.use(
        trpcMsw.resetPassword.confirm.mutation(async ({ input }) => {
          expect(input.token).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          );
          expect(input.newPassword).toBe("newsecurepassword123");

          return {
            message: "Password reset successfully. Please log in.",
          };
        }),
      );

      const result = await client.resetPassword.confirm.mutate({
        token: "550e8400-e29b-41d4-a716-446655440000",
        newPassword: "newsecurepassword123",
      });

      expect(result).toEqual({
        message: "Password reset successfully. Please log in.",
      });
    });

    it("throws NOT_FOUND for invalid or expired token", async () => {
      server.use(
        trpcMsw.resetPassword.confirm.mutation(async () => {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid or expired reset token.",
          });
        }),
      );

      await expect(
        client.resetPassword.confirm.mutate({
          token: "invalid-token",
          newPassword: "newsecurepassword123",
        }),
      ).rejects.toMatchObject({
        message: "Invalid or expired reset token.",
        data: {
          code: "NOT_FOUND",
          httpStatus: 404,
          path: "resetPassword.confirm",
        },
      });
    });

    it("throws BAD_REQUEST for password too short (real Zod)", async () => {
      await expect(
        client.resetPassword.confirm.mutate({
          token: "550e8400-e29b-41d4-a716-446655440000",
          newPassword: "short",
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Password must be at least 8 characters"),
        data: {
          code: "BAD_REQUEST",
          httpStatus: 400,
          path: "resetPassword.confirm",
        },
      });
    });

    it("throws BAD_REQUEST for invalid token format (real Zod)", async () => {
      await expect(
        client.resetPassword.confirm.mutate({
          token: "not-a-uuid",
          newPassword: "newsecurepassword123",
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Invalid reset token format"),
        data: {
          code: "BAD_REQUEST",
          httpStatus: 400,
          path: "resetPassword.confirm",
        },
      });
    });
  });
});