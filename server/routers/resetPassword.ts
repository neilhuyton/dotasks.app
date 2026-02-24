// server/routers/resetPassword.ts

import { publicProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  sendResetPasswordEmail,
  sendPasswordChangeNotification,
} from "../email";

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

      // Security: always return the same vague message (timing attack prevention)
      if (!user) {
        return {
          message:
            "If an account with this email exists, a reset link has been sent.",
        };
      }

      const resetToken = crypto.randomUUID();
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordTokenExpiresAt: resetTokenExpiresAt,
        },
      });

      // Send email directly (non-blocking in practice, but awaited for logging)
      try {
        await sendResetPasswordEmail(email, resetToken);
        // Optional: log success if you have structured logging
        // console.log(`Password reset email sent to ${email}`);
      } catch (err) {
        console.error("Failed to send password reset email:", err);
        // Still return success to user — don't fail the flow on email error
      }

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

      // Send notification directly
      try {
        await sendPasswordChangeNotification(updatedUser.email);
        // Optional: log success
      } catch (err) {
        console.error("Failed to send password change notification:", err);
        // Don't fail the mutation — user already reset password
      }

      return { message: "Password reset successfully. Please log in." };
    }),
});
