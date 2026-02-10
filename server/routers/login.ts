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
          .string()
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

      // 1. Find user
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

      // 2. Check email verification
      if (!user.isEmailVerified) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Please verify your email before logging in',
        });
      }

      // 3. Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // 4. Generate short-lived access token (JWT)
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

      // 5. Generate new refresh token & STORE HASHED VERSION
      const refreshToken = crypto.randomUUID();
      const hashedRefresh = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefresh },  // ← FIXED: store hash, not plain
      });

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
        refreshToken,           // client gets plain UUID (correct)
        message: 'Login successful',
      };
    }),
});