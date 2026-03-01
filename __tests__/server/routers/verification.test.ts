// __tests__/server/routers/verification.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";

import {
  createPublicCaller,
  resetPrismaMocks,
  mockPrisma,
} from "../../utils/testCaller";
import * as emailModule from "../../../server/email";
import type { User } from "@prisma/client";

describe("resendVerificationEmail (public procedure)", () => {
  let caller: ReturnType<typeof createPublicCaller>;

  beforeEach(() => {
    caller = createPublicCaller();
    resetPrismaMocks();

    vi.spyOn(emailModule, "sendVerificationEmail").mockResolvedValue({
      success: true,
      requestId: `mock-${Date.now()}`,
    });

    // Silence console.error in tests (optional)
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // Helper to create a minimal Prisma User object
  const createMockUser = (overrides: Partial<User> = {}) => ({
    id: crypto.randomUUID(),
    email: "test@example.com",
    password: "hashed-placeholder",
    verificationToken: "old-token",
    isEmailVerified: false,
    resetPasswordToken: null,
    resetPasswordTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it("returns success with generic message when email does not exist (security)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await caller.verification.resendVerificationEmail({
      email: "nonexistent@example.com",
    });

    expect(result).toEqual({
      success: true,
      message: "If the email exists, a verification link has been sent.",
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "nonexistent@example.com" },
      select: {
        id: true,
        isEmailVerified: true,
        verificationToken: true,
      },
    });

    // No update or email attempt
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(emailModule.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when email is already verified", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      createMockUser({ isEmailVerified: true }),
    );

    await expect(
      caller.verification.resendVerificationEmail({
        email: "verified@example.com",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This email is already verified.",
    });

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(emailModule.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("generates new token, updates user, sends email, returns success when user exists and not verified", async () => {
    const existingUser = createMockUser({
      email: "unverified@example.com",
    });

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      verificationToken: "new-token-uuid",
    });

    const result = await caller.verification.resendVerificationEmail({
      email: "unverified@example.com",
    });

    expect(result).toEqual({
      success: true,
      message: "Verification email resent. Please check your inbox/spam.",
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "unverified@example.com" },
      select: { id: true, isEmailVerified: true, verificationToken: true },
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: { verificationToken: expect.any(String) },
    });

    expect(emailModule.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(emailModule.sendVerificationEmail).toHaveBeenCalledWith(
      "unverified@example.com",
      expect.any(String), // new token
    );
  });

  it("still returns success even if email sending fails (non-blocking)", async () => {
    const existingUser = createMockUser();

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      verificationToken: "new-token",
    });

    // Simulate email failure
    vi.spyOn(emailModule, "sendVerificationEmail").mockRejectedValueOnce(
      new Error("SMTP connection failed"),
    );

    const result = await caller.verification.resendVerificationEmail({
      email: existingUser.email,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe(
      "Verification email resent. Please check your inbox/spam.",
    );

    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);

    expect(emailModule.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid email format via Zod", async () => {
    await expect(
      caller.verification.resendVerificationEmail({
        email: "invalid-email",
      }),
    ).rejects.toThrow(/Invalid email/);
  });
});
