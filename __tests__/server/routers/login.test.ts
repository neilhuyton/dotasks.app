// __tests__/server/routers/login.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import {
  createPublicCaller,
  resetPrismaMocks,
  mockPrisma,
} from "../../utils/testCaller";
import { Prisma } from "@prisma/client";

describe("login router (public procedures)", () => {
  let caller: ReturnType<typeof createPublicCaller>;
  const compareSpy = vi.spyOn(bcrypt, "compare"); // inferred type is perfect

  beforeEach(() => {
    caller = createPublicCaller();
    resetPrismaMocks();

    // Reset between tests – safe because it's a spy
    compareSpy.mockReset();
  });

  afterEach(() => {
    compareSpy.mockRestore(); // return to real implementation after each test
  });

  describe("login", () => {
    it("logs in successfully with valid credentials and verified email", async () => {
      const email = "testuser@example.com";
      const password = "password123";
      const userId = crypto.randomUUID();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        password: "any-hash",
        isEmailVerified: true,
        verificationToken: null,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Prisma.UserGetPayload<{
        include: never;
        select: undefined;
      }>);

      mockPrisma.refreshToken.create.mockResolvedValue({
        id: crypto.randomUUID(),
        hashedToken: "mock-hashed-new-refresh-token",
        userId,
        createdAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      } as Prisma.RefreshTokenGetPayload<{
        include: never;
        select: undefined;
      }>);

      compareSpy.mockImplementation(async () => true);

      const result = await caller.login({
        email,
        password,
      });

      expect(result).toMatchObject({
        user: {
          id: expect.any(String),
          email,
        },
        accessToken: expect.any(String),
        refreshToken: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        ),
        message: "Login successful",
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          isEmailVerified: true,
        },
      });

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);

      expect(compareSpy).toHaveBeenCalledWith(password, "any-hash");
      expect(compareSpy).toHaveBeenCalledTimes(1);
    });

    it("throws UNAUTHORIZED for invalid email or password", async () => {
      const email = "nonexistent@example.com";

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        caller.login({
          email,
          password: "whatever",
        }),
      ).rejects.toMatchObject({
        message: "Invalid email or password",
        code: "UNAUTHORIZED",
      });

      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
      expect(compareSpy).not.toHaveBeenCalled();
    });

    it("throws FORBIDDEN when email is not verified", async () => {
      const email = "unverified@example.com";
      const userId = crypto.randomUUID();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        password: "any-hash",
        isEmailVerified: false,
        verificationToken: null,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Prisma.UserGetPayload<{
        include: never;
        select: undefined;
      }>);

      await expect(
        caller.login({
          email,
          password: "password123",
        }),
      ).rejects.toMatchObject({
        message: "Please verify your email before logging in",
        code: "FORBIDDEN",
      });

      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
      expect(compareSpy).not.toHaveBeenCalled();
    });

    it("throws BAD_REQUEST for invalid input format (Zod)", async () => {
      await expect(
        caller.login({
          email: "invalid-email",
          password: "",
        }),
      ).rejects.toThrow(/Invalid email|password/i);

      expect(compareSpy).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
