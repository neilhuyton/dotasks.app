// server/routers/login.ts

import { publicProcedure, router } from '../trpc-base';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const loginRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z
          .email({ message: 'Invalid email address' })
          .trim()
          .toLowerCase(),
        password: z
          .string()
          .min(8, { message: 'Password must be at least 8 characters' })
          .max(128, { message: 'Password is too long' }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      const user = await ctx.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          isEmailVerified: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      if (!user.isEmailVerified) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Please verify your email before logging in',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      if (!process.env.JWT_SECRET) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server configuration error',
        });
      }

      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
      );

      // Create new refresh token record (does NOT delete others)
      const refreshToken = crypto.randomUUID();
      const hashedRefresh = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      await ctx.prisma.refreshToken.create({
        data: {
          hashedToken: hashedRefresh,
          userId: user.id,
          // Optional: expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          // deviceInfo: ctx.req.headers['user-agent'] || 'unknown',
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
        refreshToken,
        message: 'Login successful',
      };
    }),
});