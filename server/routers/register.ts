// server/routers/register.ts

import { publicProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../email";

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

      if (!process.env.JWT_SECRET) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server configuration error",
        });
      }

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
        const emailResult = await sendVerificationEmail(
          email,
          verificationToken,
        );

        if (!emailResult.success) {
          console.error(
            "Verification email failed to send:",
            emailResult.error,
          );
        }
      } catch (emailErr) {
        console.error("Email send error during registration:", emailErr);
      }

      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );

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
