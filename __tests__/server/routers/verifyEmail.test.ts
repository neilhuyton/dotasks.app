// __tests__/server/routers/verifyEmail.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';

import { createPublicCaller, resetPrismaMocks, mockPrisma } from '../../utils/testCaller';
import type { User } from '@prisma/client';

describe('verifyEmail router (public procedure)', () => {
  let caller: ReturnType<typeof createPublicCaller>;

  beforeEach(() => {
    caller = createPublicCaller();
    resetPrismaMocks();
  });

  describe('verifyEmail', () => {
    // Helper to create a valid minimal User shape
    const createMockUser = (overrides: Partial<User> = {}) => ({
      id: crypto.randomUUID(),
      email: 'test@example.com',
      password: 'hashed-placeholder',
      verificationToken: null as string | null,
      isEmailVerified: false,
      resetPasswordToken: null as string | null,
      resetPasswordTokenExpiresAt: null as Date | null,
      createdAt: new Date('2025-01-01T12:00:00Z'),
      updatedAt: new Date('2025-01-01T12:00:00Z'),
      ...overrides,
    });

    it('successfully verifies email with valid unused token', async () => {
      const token = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const email = 'user@example.com';

      mockPrisma.user.findFirst.mockResolvedValue(
        createMockUser({
          id: userId,
          email,
          verificationToken: token,
          isEmailVerified: false,
        })
      );

      mockPrisma.user.update.mockResolvedValue(
        createMockUser({
          id: userId,
          email,
          verificationToken: null,
          isEmailVerified: true,
        })
      );

      const result = await caller.verifyEmail({ token });

      expect(result).toEqual({
        message: 'Email verified successfully! You can now log in.',
        email,
      });

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { verificationToken: token },
        select: {
          id: true,
          isEmailVerified: true,
          email: true,
        },
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isEmailVerified: true,
          verificationToken: null,
        },
      });
    });

    it('throws NOT_FOUND for non-existent or mismatched token', async () => {
      const token = crypto.randomUUID();

      mockPrisma.user.findFirst.mockResolvedValue(null);

      // Simulate the second check also returning null (no already-verified user)
      mockPrisma.user.findFirst.mockResolvedValueOnce(null); // first call → null
      mockPrisma.user.findFirst.mockResolvedValueOnce(null); // second call → null

      await expect(caller.verifyEmail({ token })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Invalid or expired verification token.',
      });

      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(2);
    });

    it('throws BAD_REQUEST when token is already used (verificationToken null + verified)', async () => {
      const token = crypto.randomUUID();

      // First call: no user with this token
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      // Second call: finds a verified user with null token
      mockPrisma.user.findFirst.mockResolvedValueOnce(
        createMockUser({
          isEmailVerified: true,
          verificationToken: null,
        })
      );

      await expect(caller.verifyEmail({ token })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'This verification link has already been used or the email is verified.',
      });

      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(2);
    });

    it('throws BAD_REQUEST when user is already verified (but token still matches)', async () => {
      const token = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const email = 'already@example.com';

      mockPrisma.user.findFirst.mockResolvedValue(
        createMockUser({
          id: userId,
          email,
          verificationToken: token,
          isEmailVerified: true,
        })
      );

      await expect(caller.verifyEmail({ token })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Email is already verified.',
      });

      // Should **not** call update
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects invalid token format via Zod', async () => {
      await expect(
        caller.verifyEmail({ token: 'not-a-uuid' })
      ).rejects.toThrow(/Invalid verification token format/);
    });
  });
});