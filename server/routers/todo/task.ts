// server/routers/todo/task.ts

import { z } from "zod";
import { router, protectedProcedure } from "../../trpc-base";
import { TRPCError } from "@trpc/server";

export const taskRouter = router({
  getByList: protectedProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const listCount = await ctx.prisma.todoList.count({
        where: { id: input.listId, userId: ctx.userId },
      });

      if (listCount === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }

      return ctx.prisma.task.findMany({
        where: { listId: input.listId },
        orderBy: { order: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        dueDate: z.date().optional().nullable(),
        priority: z.number().int().min(0).max(5).optional(),
        order: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.prisma.todoList.findUnique({
        where: { id: input.listId },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.task.create({
        data: {
          ...input,
          isCompleted: false,
        },
      });
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: {
          isCompleted: true,
          listId: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      const list = await ctx.prisma.todoList.findUnique({
        where: { id: task.listId },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to modify this task",
        });
      }

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          isCompleted: !task.isCompleted,
        },
      });
    }),

  // delete, reorder, update title, etc. can be added later
});