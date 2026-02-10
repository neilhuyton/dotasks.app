// server/routers/refreshToken.ts
import { publicProcedure, router } from '../trpc-base';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const refreshTokenRouter = router({
  refresh: publicProcedure
    .input(
      z.object({
        refreshToken: z.uuid({ message: 'Invalid refresh token format' }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { refreshToken } = input;

      // 1. Hash the incoming refresh token (matches how we store it)
      const hashedRefresh = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // 2. Find user with matching hashed refresh token
      const user = await ctx.prisma.user.findFirst({
        where: { refreshToken: hashedRefresh },
        select: {
          id: true,
          email: true,
          // Optional: add lastRefreshAt or device info later for advanced detection
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        });
      }

      // Optional advanced: Reuse detection
      // If you want to detect if this token was already rotated (stolen token used after rotation)
      // You could add a `previousRefreshTokenHash` field or use a separate token family table
      // For now we keep it simple — rotation alone is very strong

      // 3. Generate new short-lived access token
      if (!process.env.JWT_SECRET) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server configuration error',
        });
      }

      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
      );

      // 4. Rotate refresh token: generate new one & hash it
      const newRefreshToken = crypto.randomUUID();
      const newHashedRefresh = crypto
        .createHash('sha256')
        .update(newRefreshToken)
        .digest('hex');

      // Update stored hash (old one is now invalid)
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newHashedRefresh },
      });

      // Optional: you could add rotation count, last used timestamp, etc.

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken, // client replaces old one
        message: 'Tokens refreshed successfully',
      };
    }),
});