// server/routers/todo/task.ts

import { z } from "zod";
import { router, protectedProcedure } from "../../trpc-base";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

export const taskRouter = router({
  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        include: {
          list: {
            select: { userId: true },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      if (task.list.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this task",
        });
      }

      return {
        ...task,
        list: undefined,
      };
    }),

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
          { isCurrent: "desc" },
          { order: "asc" },
          { createdAt: "asc" },
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

      const lastTask = await ctx.prisma.task.findFirst({
        where: { listId: input.listId },
        select: { order: true },
        orderBy: { order: "desc" },
        take: 1,
      });

      const nextOrder = lastTask ? lastTask.order + 1 : 0;

      return ctx.prisma.task.create({
        data: {
          ...input,
          order: nextOrder,
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

      const isOrWillBeCompleted =
        inputData.isCompleted === true ||
        (inputData.isCompleted === undefined && task.isCompleted);

      if (isOrWillBeCompleted) {
        finalData.isPinned = false;
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
          data: {
            isCurrent: true,
            order: -1,
          },
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

      if (task.isCompleted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot pin a completed task",
        });
      }

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { isPinned: !task.isPinned },
      });
    }),

  reorder: protectedProcedure
    .input(
      z.array(
        z.object({ id: z.string().uuid(), order: z.number().int().min(0) }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.map(({ id, order }) =>
          ctx.prisma.task.update({
            where: { id },
            data: { order },
          }),
        ),
      );

      return { success: true, updated: input };
    }),
});
