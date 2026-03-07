// server/routers/user.ts

import { protectedProcedure, publicProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

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

      return {
        message: "Email updated successfully",
        email: updatedUser.email,
      };
    }),

  createOrSync: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        email: z.string().email().trim().toLowerCase(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, email } = input;

      let user = await ctx.prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true },
      });

      if (user) {
        if (user.email !== email) {
          user = await ctx.prisma.user.update({
            where: { id },
            data: { email },
            select: { id: true, email: true },
          });
        }
        return {
          success: true,
          message: "User already synced",
          user,
        };
      }

      user = await ctx.prisma.user.create({
        data: {
          id, 
          email,
        },
        select: { id: true, email: true },
      });

      return {
        success: true,
        message: "User created in database",
        user,
      };
    }),
});
