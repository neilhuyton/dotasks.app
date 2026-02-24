// server/routers/user.ts

import { protectedProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sendEmailChangeNotification } from "../email";

export const userRouter = router({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  updateEmail: protectedProcedure
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
      const userId = ctx.userId;

      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!currentUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const oldEmail = currentUser.email;

      if (oldEmail === email) {
        return {
          message: "Email is already up to date",
          email,
        };
      }

      const conflictingUser = await ctx.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (conflictingUser && conflictingUser.id !== userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email is already in use by another account",
        });
      }

      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data: { email },
        select: { email: true },
      });

      // Send notification to the old email address
      if (oldEmail !== email) {
        try {
          await sendEmailChangeNotification(oldEmail, email);
          // Optional: structured logging if you have it
          // console.log(`Email change notification sent to ${oldEmail}`);
        } catch (err) {
          console.error("Failed to send email change notification:", {
            userId,
            oldEmail,
            newEmail: email,
            error: err instanceof Error ? err.message : String(err),
          });
          // Do NOT throw — the email is non-critical
        }
      }

      return {
        message: "Email updated successfully",
        email: updatedUser.email,
      };
    }),
});
