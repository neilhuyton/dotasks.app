// server/routers/register.ts
import { publicProcedure, router } from '../trpc-base'; // ← use publicProcedure since this is unauthenticated
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail } from '../email';

export const registerRouter = router({
  register: publicProcedure  // ← public, no auth required
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

      // 1. Check for existing user (case-insensitive email)
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This email is already registered',
        });
      }

      // 2. Hash password (bcrypt with cost 12 is solid in 2026; was 10 before)
      const hashedPassword = await bcrypt.hash(password, 12);

      // 3. Generate secure tokens
      const verificationToken = crypto.randomUUID();
      const refreshToken = crypto.randomUUID(); // opaque, random

      // 4. Create user (email unverified)
      const user = await ctx.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          verificationToken,
          refreshToken, // ← storing plain for now; see notes below
          isEmailVerified: false,
        },
        select: {
          id: true,
          email: true,
        },
      });

      // 5. Send verification email (non-blocking, log failures)
      sendVerificationEmail(email, verificationToken).catch((err) => {
        console.error('Failed to send verification email:', {
          userId: user.id,
          email,
          error: err instanceof Error ? err.message : String(err),
        });
        // In prod: use proper logger (pino, winston), maybe Sentry
      });

      // 6. Issue short-lived access token (JWT)
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

      // Return payload (client will store tokens appropriately)
      return {
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
        refreshToken,
        message:
          'Registration successful! Please check your email to verify your account.',
      };
    }),
});