// __tests__/server/routers/user.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';

import {
  createProtectedCaller,
  resetPrismaMocks,
  mockPrisma,
} from '../../utils/testCaller';

import { mockUsers } from '../../../__mocks__/mockUsers';
import type { User } from '@prisma/client';

// Type for what getCurrent actually returns
type GetCurrentReturn = {
  id: string;
  email: string;
};

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
    createdAt: partial.createdAt instanceof Date ? partial.createdAt : new Date(partial.createdAt || defaults.createdAt),
    updatedAt: partial.updatedAt instanceof Date ? partial.updatedAt : new Date(partial.updatedAt || defaults.updatedAt),
    resetPasswordTokenExpiresAt: partial.resetPasswordTokenExpiresAt
      ? new Date(partial.resetPasswordTokenExpiresAt)
      : null,
  } as User;
}

describe('user router (protected procedures)', () => {
  let caller: ReturnType<typeof createProtectedCaller>;

  beforeEach(() => {
    caller = createProtectedCaller();
    resetPrismaMocks();
  });

  const currentUserBase = mockUsers.find((u) => u.id === 'test-user-id') || mockUsers[0];

  describe('getCurrent', () => {
    it('returns the current authenticated user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        mockFullUser({
          id: currentUserBase.id,
          email: currentUserBase.email,
        })
      );

      const result = await caller.user.getCurrent();

      // Changed from .toEqual → .toMatchObject to ignore extra fields
      expect(result).toMatchObject({
        id: currentUserBase.id,
        email: currentUserBase.email,
      } as GetCurrentReturn);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
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
        where: { id: 'test-user-id' },
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
        where: { id: 'test-user-id' },
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