// server/routers/resetPassword.ts

import { publicProcedure, router } from '../trpc-base';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  sendResetPasswordEmail,
  sendPasswordChangeNotification,
} from '../email';

export const resetPasswordRouter = router({
  request: publicProcedure
    .input(
      z.object({
        email: z
          .string()
          .email({ message: 'Invalid email address' })
          .trim()
          .toLowerCase(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // 1. Find user (don't reveal existence)
      const user = await ctx.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      // Always return the same success message (prevents user enumeration)
      if (!user) {
        return {
          message: 'If an account with this email exists, a reset link has been sent.',
        };
      }

      // 2. Generate secure one-time token
      const resetToken = crypto.randomUUID();
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Optional improvement: hash the token before storing (stronger against DB leaks)
      // const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken, // or hashedResetToken if you switch
          resetPasswordTokenExpiresAt: resetTokenExpiresAt,
        },
      });

      // 3. Send reset email (fire-and-forget — don't block success)
      sendResetPasswordEmail(email, resetToken).catch((err) => {
        console.error('Failed to send password reset email:', {
          userId: user.id,
          email,
          error: err instanceof Error ? err.message : String(err),
        });
        // In prod: use structured logger + alerting (Sentry, etc.)
      });

      return {
        message: 'If an account with this email exists, a reset link has been sent.',
      };
    }),

  confirm: publicProcedure
    .input(
      z.object({
        token: z.string().uuid({ message: 'Invalid reset token format' }),
        newPassword: z
          .string()
          .min(8, { message: 'Password must be at least 8 characters' })
          .max(128, { message: 'Password is too long' }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { token, newPassword } = input;

      // 1. Find valid, non-expired token
      const user = await ctx.prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordTokenExpiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired reset token.',
        });
      }

      // 2. Hash new password (cost 12 — modern 2026 recommendation: 12–14)
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // 3. Update password & clear reset token (makes it single-use)
      const updatedUser = await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordTokenExpiresAt: null,
        },
        select: { email: true },
      });

      // 4. Send change notification (non-blocking)
      sendPasswordChangeNotification(updatedUser.email).catch((err) => {
        console.error('Failed to send password change notification:', {
          userId: user.id,
          email: updatedUser.email,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return { message: 'Password reset successfully. Please log in.' };
    }),
});