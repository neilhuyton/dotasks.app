// __tests__/server/routers/refreshToken.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

import { createPublicCaller, resetPrismaMocks, mockPrisma } from '../../utils/testCaller';
import type { RefreshToken } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('refreshToken router (public procedures)', () => {
  let caller: ReturnType<typeof createPublicCaller>;

  beforeEach(() => {
    caller = createPublicCaller();
    resetPrismaMocks();
  });

  describe('refresh', () => {
    it('refreshes tokens successfully with valid refresh token', async () => {
      const plainRefreshToken = crypto.randomUUID();
      const hashedRefreshToken = crypto
        .createHash('sha256')
        .update(plainRefreshToken)
        .digest('hex');

      const userId = crypto.randomUUID();
      const email = 'user@example.com';

      // Mock finding the valid token record (with included user)
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: crypto.randomUUID(),
        hashedToken: hashedRefreshToken,
        userId,
        createdAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
        user: {
          id: userId,
          email,
        },
      } as Prisma.RefreshTokenGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              email: true;
            };
          };
        };
      }>);

      // Mock creating new refresh token
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: crypto.randomUUID(),
        hashedToken: 'new-hashed-token-xyz',
        userId,
        createdAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      } satisfies RefreshToken);

      const result = await caller.refreshToken.refresh({
        refreshToken: plainRefreshToken,
      });

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        ),
        message: 'Tokens refreshed successfully',
      });

      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { hashedToken: hashedRefreshToken },
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      });

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('throws UNAUTHORIZED for invalid or expired refresh token', async () => {
      const plainRefreshToken = crypto.randomUUID();

      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        caller.refreshToken.refresh({
          refreshToken: plainRefreshToken,
        }),
      ).rejects.toMatchObject({
        message: 'Invalid or expired refresh token',
        code: 'UNAUTHORIZED',
      });

      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('throws BAD_REQUEST for invalid refresh token format (Zod)', async () => {
      await expect(
        caller.refreshToken.refresh({
          refreshToken: 'not-a-uuid',
        }),
      ).rejects.toThrow(/Invalid refresh token format/);
    });
  });
});