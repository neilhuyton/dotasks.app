// __tests__/server/routers/user.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

import {
  createProtectedCaller,
  resetPrismaMocks,
  mockPrisma,
} from '../../utils/testCaller';

import type { User } from '@prisma/client';

vi.mock('../../../server/email', () => ({
  sendEmailChangeNotification: vi.fn().mockResolvedValue({
    success: true,
    requestId: `mock-email-change-${Date.now()}`,
  }),
  sendResetPasswordEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordChangeNotification: vi.fn().mockResolvedValue({ success: true }),
  sendMailWithDebug: vi.fn().mockResolvedValue({ success: true }),
}));

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
  } as User;
}

describe('user router (protected procedures)', () => {
  let caller: ReturnType<typeof createProtectedCaller>;

  beforeEach(() => {
    caller = createProtectedCaller();
    resetPrismaMocks();
  });

  const currentUserBase = {
    id: 'test-user-id',
    email: 'testuser@example.com',
  };

  describe('getCurrent', () => {
    it('returns the current authenticated user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        mockFullUser({
          id: currentUserBase.id,
          email: currentUserBase.email,
        })
      );

      const result = await caller.user.getCurrent();

      expect(result).toMatchObject({
        id: currentUserBase.id,
        email: currentUserBase.email,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: currentUserBase.id },
        select: {
          id: true,
          email: true,
        },
      });
    });

    it('throws NOT_FOUND when the user no longer exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(caller.user.getCurrent()).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'User not found',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: currentUserBase.id },
        select: {
          id: true,
          email: true,
        },
      });
    });
  });

  describe('updateEmail', () => {
    it('successfully updates email when new email is available', async () => {
      const newEmail = 'brand-new@example.com';

      mockPrisma.user.findUnique.mockResolvedValueOnce(
        mockFullUser({
          email: currentUserBase.email,
        })
      );

      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      mockPrisma.user.update.mockResolvedValue(
        mockFullUser({
          email: newEmail,
        })
      );

      const result = await caller.user.updateEmail({ email: newEmail });

      expect(result).toEqual({
        message: 'Email updated successfully',
        email: newEmail,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: currentUserBase.id },
        data: { email: newEmail },
        select: { email: true },
      });
    });

    it('returns success message when email is unchanged (same value)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(
        mockFullUser({
          email: currentUserBase.email,
        })
      );

      const result = await caller.user.updateEmail({
        email: currentUserBase.email,
      });

      expect(result).toEqual({
        message: 'Email is already up to date',
        email: currentUserBase.email,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();

    });

    it('throws BAD_REQUEST for invalid email format (Zod)', async () => {
      await expect(
        caller.user.updateEmail({ email: 'invalid-email-format' })
      ).rejects.toThrow(/Invalid email address/);

    });

    it('throws CONFLICT when new email is already taken by another user', async () => {
      const conflictingEmail = 'already.taken@example.com';

      mockPrisma.user.findUnique.mockResolvedValueOnce(
        mockFullUser({
          email: currentUserBase.email,
        })
      );

      mockPrisma.user.findUnique.mockResolvedValueOnce(
        mockFullUser({
          id: 'other-user-id',
          email: conflictingEmail,
        })
      );

      await expect(
        caller.user.updateEmail({ email: conflictingEmail })
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'This email is already in use by another account',
      });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();

    });

    it('throws NOT_FOUND when current user does not exist (edge case)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        caller.user.updateEmail({ email: 'new@example.com' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'User not found',
      });

    });
  });
});