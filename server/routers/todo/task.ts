// server/routers/todo/task.ts

import { z } from "zod";
import { router, protectedProcedure } from "../../trpc-base";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client"; // ← needed for Prisma.TaskUpdateInput

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
        orderBy: [{ isPinned: "desc" }, { order: "asc" }],
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
          isCurrent: false,
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
        isPinned: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...inputData } = input;

      const task = await ctx.prisma.task.findUnique({
        where: { id },
        select: { listId: true, isCompleted: true },
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

      const finalData: Prisma.TaskUpdateInput = { ...inputData };

      // Enforce: completed tasks cannot be pinned
      const isOrWillBeCompleted =
        inputData.isCompleted === true ||
        (inputData.isCompleted === undefined && task.isCompleted);

      if (isOrWillBeCompleted) {
        finalData.isPinned = false;
        // Optional: also force-unset current if you want to be stricter
        // finalData.isCurrent = false;
      }

      return ctx.prisma.task.update({
        where: { id },
        data: finalData,
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

      const updateData: Prisma.TaskUpdateInput = {
        isCompleted: !task.isCompleted,
      };

      if (willBeCompleted) {
        updateData.isPinned = false;
        updateData.isCurrent = false;
      }

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: updateData,
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

  setCurrent: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        listId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
        await tx.task.updateMany({
          where: {
            listId: input.listId,
            isCurrent: true,
            id: { not: input.id },
          },
          data: { isCurrent: false },
        });

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
      const list = await ctx.prisma.todoList.findUnique({
        where: { id: input.listId },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.prisma.task.updateMany({
        where: {
          listId: input.listId,
          isCurrent: true,
        },
        data: { isCurrent: false },
      });

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
        select: { listId: true, isCompleted: true, isPinned: true },
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

      // Extra safety: don't allow pinning already completed tasks
      if (task.isCompleted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot pin a completed task",
        });
      }

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { isPinned: !task.isCompleted ? !task.isPinned : false },
      });
    }),
});
