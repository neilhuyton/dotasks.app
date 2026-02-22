// server/routers/resetPassword.ts

import { publicProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export const resetPasswordRouter = router({
  request: publicProcedure
    .input(
      z.object({
        email: z
          .string()
          .email({ message: "Invalid email address" })
          .trim()
          .toLowerCase(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      const user = await ctx.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      if (!user) {
        return {
          message:
            "If an account with this email exists, a reset link has been sent.",
        };
      }

      const resetToken = crypto.randomUUID();
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordTokenExpiresAt: resetTokenExpiresAt,
        },
      });

      // Queue background reset email
      fetch(
        `${process.env.URL || "http://localhost:8888"}/.netlify/functions/send-email-background`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "reset-password",
            to: email,
            token: resetToken,
          }),
        },
      ).catch((err) => {
        console.error("Failed to queue password reset email:", err);
      });

      return {
        message:
          "If an account with this email exists, a reset link has been sent.",
      };
    }),

  confirm: publicProcedure
    .input(
      z.object({
        token: z.string().uuid({ message: "Invalid reset token format" }),
        newPassword: z
          .string()
          .min(8, { message: "Password must be at least 8 characters" })
          .max(128, { message: "Password is too long" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { token, newPassword } = input;

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
          code: "NOT_FOUND",
          message: "Invalid or expired reset token.",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const updatedUser = await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordTokenExpiresAt: null,
        },
        select: { email: true },
      });

      // Queue background notification
      fetch(
        `${process.env.URL || "http://localhost:8888"}/.netlify/functions/send-email-background`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "password-change",
            to: updatedUser.email,
          }),
        },
      ).catch((err) => {
        console.error("Failed to queue password change notification:", err);
      });

      return { message: "Password reset successfully. Please log in." };
    }),
});
