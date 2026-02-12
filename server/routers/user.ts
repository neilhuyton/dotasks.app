// server/routers/user.ts

import { protectedProcedure, router } from '../trpc-base';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { sendEmailChangeNotification } from '../email';

export const userRouter = router({
  updateEmail: protectedProcedure
    .input(
      z.object({
        email: z.string().email({ message: 'Invalid email address' }).trim().toLowerCase(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { email } = input;
      const userId = ctx.userId; // guaranteed string by protectedProcedure

      // 1. Fetch current user's email
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!currentUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const oldEmail = currentUser.email;

      // Early return if no change → avoids unnecessary DB write & email
      if (oldEmail === email) {
        return {
          message: 'Email is already up to date',
          email,
        };
      }

      // 2. Check for email conflict
      const conflictingUser = await ctx.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (conflictingUser && conflictingUser.id !== userId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This email is already in use by another account',
        });
      }

      // 3. Update email in database
      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data: { email },
        select: { email: true },
      });

      // 4. Send notification to old email (fire-and-forget, non-blocking)
      if (oldEmail !== email) {
        sendEmailChangeNotification(oldEmail, email).catch((err) => {
          // Log failure without affecting the response
          // Replace console.error with your actual logger (winston, pino, etc.)
          console.error('Failed to send email change notification:', {
            userId,
            oldEmail,
            newEmail: email,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      return {
        message: 'Email updated successfully',
        email: updatedUser.email,
      };
    }),
});