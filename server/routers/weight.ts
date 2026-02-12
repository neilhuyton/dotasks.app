// server/routers/weight.ts

import { protectedProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

export const weightRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        weightKg: z
          .number()
          .positive({ message: "Weight must be a positive number" })
          .max(500, { message: "Weight cannot exceed 500 kg" }),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // ctx.userId is string here (no ! or if-check needed)

      const weight = await ctx.prisma.weightMeasurement.create({
        data: {
          userId: ctx.userId,
          weightKg: input.weightKg,
          note: input.note,
        },
      });

      const currentGoal = await ctx.prisma.goal.findFirst({
        where: {
          userId: ctx.userId,
          reachedAt: null,
        },
        orderBy: { goalSetAt: "desc" },
      });

      if (currentGoal && input.weightKg <= currentGoal.goalWeightKg) {
        await ctx.prisma.goal.update({
          where: { id: currentGoal.id },
          data: { reachedAt: new Date() },
        });
      }

      return weight;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        weightKg: z.number().positive().max(500),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const updated = await ctx.prisma.weightMeasurement.update({
          where: {
            id: input.id,
            userId: ctx.userId,
          },
          data: {
            weightKg: input.weightKg,
            note: input.note,
          },
        });

        // Optional: re-check goal if weight changed significantly
        // (you can copy logic from create if desired)

        return updated;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Weight entry not found or not owned by you",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update weight",
        });
      }
    }),

  getWeights: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.weightMeasurement.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        weightKg: true,
        note: true,
        createdAt: true,
      },
    });
  }),

  delete: protectedProcedure
    .input(
      z.object({
        weightId: z.string().uuid({ message: "Invalid weight ID" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await ctx.prisma.weightMeasurement.delete({
          where: {
            id: input.weightId,
            userId: ctx.userId,
          },
        });

        return { success: true, deletedId: input.weightId };
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Weight measurement not found or not owned by you",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete weight measurement",
        });
      }
    }),

  setGoal: protectedProcedure
    .input(
      z.object({
        goalWeightKg: z
          .number()
          .positive({ message: "Goal weight must be a positive number" })
          .max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const activeGoal = await ctx.prisma.goal.findFirst({
        where: {
          userId: ctx.userId,
          reachedAt: null,
        },
      });

      if (activeGoal) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "You already have an active goal. Reach it, abandon it, or edit it before setting a new one.",
        });
      }

      return ctx.prisma.goal.create({
        data: {
          userId: ctx.userId,
          goalWeightKg: input.goalWeightKg,
          goalSetAt: new Date(),
        },
      });
    }),

  updateGoal: protectedProcedure
    .input(
      z.object({
        goalId: z.string().uuid({ message: "Invalid goal ID" }),
        goalWeightKg: z
          .number()
          .positive({ message: "Goal weight must be a positive number" })
          .max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.goal.update({
          where: {
            id: input.goalId,
            userId: ctx.userId,
            reachedAt: null,
          },
          data: { goalWeightKg: input.goalWeightKg },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Goal not found, does not belong to you, or is already reached",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update goal",
        });
      }
    }),

  getCurrentGoal: protectedProcedure.query(async ({ ctx }) => {
    const goal = await ctx.prisma.goal.findFirst({
      where: {
        userId: ctx.userId,
        reachedAt: null,
      },
      orderBy: { goalSetAt: "desc" },
      select: {
        id: true,
        goalWeightKg: true,
        goalSetAt: true,
      },
    });

    return goal ?? null;
  }),

  getGoals: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.goal.findMany({
      where: { userId: ctx.userId },
      orderBy: { goalSetAt: "desc" },
      select: {
        id: true,
        goalWeightKg: true,
        goalSetAt: true,
        reachedAt: true,
      },
    });
  }),
});
