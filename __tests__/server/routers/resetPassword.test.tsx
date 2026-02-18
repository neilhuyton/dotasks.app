// __tests__/server/routers/resetPassword.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';

import { createPublicCaller, resetPrismaMocks, mockPrisma } from '../../utils/testCaller';
import type { User } from '@prisma/client';

// Helper to create a complete Prisma User object
function mockFullUser(partial: Partial<User> = {}): User {
  const defaults = {
    id: crypto.randomUUID(),
    email: 'default@example.com',
    password: 'hashed-default-password',
    verificationToken: null,
    isEmailVerified: true,
    resetPasswordToken: null,
    resetPasswordTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ...defaults,
    ...partial,
    createdAt:
      partial.createdAt instanceof Date
        ? partial.createdAt
        : new Date(partial.createdAt || defaults.createdAt),
    updatedAt:
      partial.updatedAt instanceof Date
        ? partial.updatedAt
        : new Date(partial.updatedAt || defaults.updatedAt),
    resetPasswordTokenExpiresAt: partial.resetPasswordTokenExpiresAt
      ? new Date(partial.resetPasswordTokenExpiresAt)
      : null,
  } as User;
}

describe('resetPassword router (public procedures)', () => {
  let caller: ReturnType<typeof createPublicCaller>;

  beforeEach(() => {
    caller = createPublicCaller();
    resetPrismaMocks();
  });

  describe('request', () => {
    it('returns the same success message whether email exists or not (anti-enumeration)', async () => {
      const email = 'existing@example.com';

      mockPrisma.user.findUnique.mockResolvedValue(
        mockFullUser({ email, isEmailVerified: true })
      );

      mockPrisma.user.update.mockResolvedValue(
        mockFullUser({
          email,
          resetPasswordToken: crypto.randomUUID(),
          resetPasswordTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        })
      );

      const result = await caller.resetPassword.request({ email });

      expect(result).toMatchObject({
        message: 'If an account with this email exists, a reset link has been sent.',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        select: { id: true, email: true },
      });

      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('still returns success message for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await caller.resetPassword.request({
        email: 'does-not-exist@example.com',
      });

      expect(result).toMatchObject({
        message: 'If an account with this email exists, a reset link has been sent.',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects invalid email format (Zod)', async () => {
      await expect(
        caller.resetPassword.request({ email: 'not-an-email' })
      ).rejects.toThrowError(/Invalid email address/);
    });

    it('rejects empty/whitespace-only email', async () => {
      await expect(
        caller.resetPassword.request({ email: '   ' })
      ).rejects.toThrowError(/Invalid email address/);
    });
  });

  describe('confirm', () => {
    const validToken = crypto.randomUUID();
    const validPassword = 'VerySecure123!';

    it('successfully resets password with valid non-expired token', async () => {
      const userId = crypto.randomUUID();
      const email = 'user@example.com';

      mockPrisma.user.findFirst.mockResolvedValue(
        mockFullUser({
          id: userId,
          email,
          resetPasswordToken: validToken,
          resetPasswordTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        })
      );

      mockPrisma.user.update.mockResolvedValue(
        mockFullUser({
          id: userId,
          email,
          password: 'new-hashed-password',
          resetPasswordToken: null,
          resetPasswordTokenExpiresAt: null,
        })
      );

      const result = await caller.resetPassword.confirm({
        token: validToken,
        newPassword: validPassword,
      });

      expect(result).toMatchObject({
        message: 'Password reset successfully. Please log in.',
      });

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetPasswordToken: validToken,
          resetPasswordTokenExpiresAt: { gt: expect.any(Date) },
        },
        select: expect.anything(),
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            password: expect.any(String),
            resetPasswordToken: null,
            resetPasswordTokenExpiresAt: null,
          }),
        })
      );
    });

    it('rejects expired token', async () => {
      // Simulate the case where the expiration check fails (expired token)
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        caller.resetPassword.confirm({
          token: validToken,
          newPassword: validPassword,
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Invalid or expired reset token.',
      });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects invalid/non-existent token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        caller.resetPassword.confirm({
          token: validToken,
          newPassword: validPassword,
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Invalid or expired reset token.',
      });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects too short password (Zod)', async () => {
      await expect(
        caller.resetPassword.confirm({
          token: validToken,
          newPassword: 'abc123',
        })
      ).rejects.toThrow(/Password must be at least 8 characters/);
    });

    it('rejects invalid UUID token format (Zod)', async () => {
      await expect(
        caller.resetPassword.confirm({
          token: 'not-a-uuid-!!!!',
          newPassword: validPassword,
        })
      ).rejects.toThrow(/Invalid reset token format/);
    });
  });
});