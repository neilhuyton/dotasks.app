// server/routers/register.ts

import { publicProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { sendVerificationEmail } from "../email";
import { signSupabaseJwt } from "./auth-helpers"; // ← new import

export const registerRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z
          .string()
          .email({ message: "Invalid email address" })
          .trim()
          .toLowerCase(),
        password: z
          .string()
          .min(8, { message: "Password must be at least 8 characters" })
          .max(128, { message: "Password is too long" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email is already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = crypto.randomUUID();
      const refreshToken = crypto.randomUUID();

      const user = await ctx.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          verificationToken,
          isEmailVerified: false,
        },
        select: {
          id: true,
          email: true,
        },
      });

      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await ctx.prisma.refreshToken.create({
        data: {
          hashedToken: hashedRefresh,
          userId: user.id,
        },
      });

      try {
        await sendVerificationEmail(email, verificationToken);
      } catch (emailErr) {
        console.error("Email send error during registration:", emailErr);
      }

      const accessToken = signSupabaseJwt({
        userId: user.id,
        email: user.email,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
        refreshToken,
        message:
          "Registration successful! Please check your email to verify your account.",
      };
    }),
});
