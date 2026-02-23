// __tests__/server/routers/register.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

import { createPublicCaller, resetPrismaMocks, mockPrisma } from '../../utils/testCaller';
import type { User } from '@prisma/client';
import * as emailModule from '../../../server/email';

// Minimal valid shape for RefreshToken (adjust fields if your schema has more/less)
const mockRefreshToken = {
  id: crypto.randomUUID(),
  hashedToken: 'mock-hashed-token-value',
  userId: crypto.randomUUID(),
  createdAt: new Date(),
  lastUsedAt: null,
  expiresAt: null,
} as const;

// Helper to create a complete Prisma User object (consistent with other auth tests)
function mockFullUser(partial: Partial<User> = {}): User {
  const now = new Date();

  const user: User = {
    id: crypto.randomUUID(),
    email: 'default@example.com',
    password: 'hashed-placeholder',
    verificationToken: null,
    isEmailVerified: false,
    resetPasswordToken: null,
    resetPasswordTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };

  if ('createdAt' in partial) {
    user.createdAt =
      partial.createdAt instanceof Date
        ? partial.createdAt
        : new Date(partial.createdAt!);
  }

  if ('updatedAt' in partial) {
    user.updatedAt =
      partial.updatedAt instanceof Date
        ? partial.updatedAt
        : new Date(partial.updatedAt!);
  }

  if ('resetPasswordTokenExpiresAt' in partial) {
    user.resetPasswordTokenExpiresAt =
      partial.resetPasswordTokenExpiresAt
        ? new Date(partial.resetPasswordTokenExpiresAt)
        : null;
  }

  return user;
}

describe('register procedure (public)', () => {
  let caller: ReturnType<typeof createPublicCaller>;

  beforeEach(() => {
    caller = createPublicCaller();
    resetPrismaMocks();
    vi.spyOn(emailModule, 'sendVerificationEmail').mockResolvedValue({ success: true });
  });

  it('registers a new user successfully + sends verification email', async () => {
    const email = 'newuser@example.com';

    mockPrisma.user.findUnique.mockResolvedValue(null);

    mockPrisma.user.create.mockResolvedValue(
      mockFullUser({ email })
    );

    mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

    const result = await caller.register({
      email,
      password: 'password123',
    });

    expect(result).toMatchObject({
      user: {
        id: expect.any(String),
        email,
      },
      accessToken: expect.any(String),
      refreshToken: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      ),
      message: 'Registration successful! Please check your email to verify your account.',
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email },
      select: { id: true },
    });

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email,
          password: expect.any(String),
          verificationToken: expect.any(String),
          isEmailVerified: false,
        }),
        select: { id: true, email: true },
      })
    );

    expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);

    expect(emailModule.sendVerificationEmail).toHaveBeenCalledWith(
      email,
      expect.any(String)
    );
  });

  it('throws BAD_REQUEST for invalid email format (Zod)', async () => {
    await expect(
      caller.register({
        email: 'not-an-email',
        password: 'password123',
      })
    ).rejects.toThrow(/Invalid email address/);
  });

  it('throws BAD_REQUEST for password too short (Zod)', async () => {
    await expect(
      caller.register({
        email: 'newuser@example.com',
        password: 'short',
      })
    ).rejects.toThrow(/Password must be at least 8 characters/);
  });

  it('throws CONFLICT when email is already registered', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      mockFullUser({ email: 'existing@example.com' })
    );

    await expect(
      caller.register({
        email: 'existing@example.com',
        password: 'password123',
      })
    ).rejects.toMatchObject({
      message: 'This email is already registered',
      code: 'CONFLICT',
    });

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});