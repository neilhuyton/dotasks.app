// server/routers/verifyEmail.ts

import { publicProcedure, router } from '../trpc-base';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const verifyEmailRouter = router({
  verifyEmail: publicProcedure  // public — no auth required to verify
    .input(
      z.object({
        token: z.string().uuid({ message: 'Invalid verification token format' }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { token } = input;

      // 1. Find user by verification token
      const user = await ctx.prisma.user.findFirst({
        where: { verificationToken: token },
        select: {
          id: true,
          isEmailVerified: true,
          email: true, // for potential logging/context
        },
      });

      if (!user) {
        // Optional: check if token was used before (already verified)
        // This helps give better UX vs generic "invalid"
        const alreadyVerified = await ctx.prisma.user.findFirst({
          where: {
            verificationToken: null,
            isEmailVerified: true,
          },
          select: { id: true },
        });

        if (alreadyVerified) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This verification link has already been used or the email is verified.',
          });
        }

        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired verification token.',
        });
      }

      // 2. Check if already verified (idempotent)
      if (user.isEmailVerified) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email is already verified.',
        });
      }

      // 3. Mark as verified & clear token
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          verificationToken: null, // clear so it can't be reused
        },
      });

      // Optional future: could log successful verification, send welcome email, etc.
      // But keep it simple here — non-blocking

      return {
        message: 'Email verified successfully! You can now log in.',
        email: user.email, // optional — client can use to auto-fill login or show confirmation
      };
    }),
});