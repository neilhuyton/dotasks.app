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

        orderBy: [
          { isPinned: "desc" }, // pinned tasks first
          { order: "asc" }, // then by your drag-drop order
        ],
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
          isCurrent: false, // ← explicitly false on creation
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional().nullable(),
        dueDate: z.date().optional().nullable(),
        priority: z.number().int().min(0).max(5).optional().nullable(),
        order: z.number().int().optional(),
        isCompleted: z.boolean().optional(),
        isCurrent: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Find task and check ownership via list
      const task = await ctx.prisma.task.findUnique({
        where: { id },
        select: { listId: true },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      const list = await ctx.prisma.todoList.findUnique({
        where: { id: task.listId },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Perform the partial update
      return ctx.prisma.task.update({
        where: { id },
        data,
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

      const willBeCompleted = !task.isCompleted;

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          isCompleted: !task.isCompleted,
          // Force-remove isCurrent when completing the task
          isCurrent: willBeCompleted ? false : undefined, // only change when becoming completed
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { listId: true },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      const list = await ctx.prisma.todoList.findUnique({
        where: { id: task.listId },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.task.delete({
        where: { id: input.id },
      });
    }),

  // ─── NEW: Set exactly one task as the "current/working on" task per list ───
  setCurrent: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(), // task id
        listId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify task exists and belongs to user via list
      const task = await ctx.prisma.task.findFirst({
        where: {
          id: input.id,
          listId: input.listId,
          list: { userId: ctx.userId },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found or you don't have access",
        });
      }

      if (task.isCompleted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot set a completed task as current",
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        // Remove current flag from all other tasks in the list
        await tx.task.updateMany({
          where: {
            listId: input.listId,
            isCurrent: true,
            id: { not: input.id },
          },
          data: { isCurrent: false },
        });

        // Set this task as current
        return tx.task.update({
          where: { id: input.id },
          data: { isCurrent: true },
        });
      });
    }),

  clearCurrent: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the list
      const list = await ctx.prisma.todoList.findUnique({
        where: { id: input.listId },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Clear isCurrent from all tasks in the list
      await ctx.prisma.task.updateMany({
        where: {
          listId: input.listId,
          isCurrent: true,
        },
        data: { isCurrent: false },
      });

      // Return something simple (no single updated task)
      return { success: true };
    }),

  pinToggle: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { listId: true },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const list = await ctx.prisma.todoList.findUnique({
        where: { id: task.listId },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updatedTask = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { isPinned: true },
      });

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { isPinned: !updatedTask!.isPinned },
      });
    }),
});
