// server/routers/todo/list.ts

import { z } from "zod";
import { router, protectedProcedure } from "../../trpc-base";
import { TRPCError } from "@trpc/server";

export const listRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.todoList.findMany({
      where: {
        userId: ctx.userId,
        isArchived: false,
      },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        color: true,
        icon: true,
        isPinned: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { tasks: true },
        },
        tasks: {
          where: { isCompleted: false },
          orderBy: { order: "asc" },
          take: 3,
          select: {
            id: true,
            title: true,
            isCompleted: true,
          },
        },
      },
    });
  }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const list = await ctx.prisma.todoList.findUnique({
        where: { id: input.id },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return list;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1, { message: "Title cannot be empty" }),
        description: z.string().max(1000).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lastList = await ctx.prisma.todoList.findFirst({
        where: {
          userId: ctx.userId,
          isArchived: false,
        },
        select: { order: true },
        orderBy: { order: "desc" },
        take: 1,
      });

      const nextOrder = lastList ? lastList.order + 1 : 0;

      return ctx.prisma.todoList.create({
        data: {
          ...input,
          userId: ctx.userId,
          order: nextOrder,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1, { message: "Title cannot be empty" }),
        description: z.string().max(1000).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const list = await ctx.prisma.todoList.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.todoList.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.prisma.todoList.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.todoList.delete({
        where: { id: input.id },
      });
    }),

  pin: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.prisma.todoList.findUnique({
        where: { id: input.id },
        select: { userId: true, isPinned: true },
      });

      if (!list || list.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.todoList.update({
        where: { id: input.id },
        data: { isPinned: !list.isPinned },
      });
    }),

  getPinned: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.todoList.findMany({
      where: {
        userId: ctx.userId,
        isPinned: true,
        isArchived: false,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        color: true,
        icon: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tasks: true,
          },
        },
        tasks: {
          where: { isCompleted: false },
          orderBy: { order: "asc" },
          take: 3,
          select: {
            id: true,
            title: true,
            isCompleted: true,
          },
        },
      },
    });
  }),

  reorder: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.string().uuid(),
          order: z.number().int().min(0),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const listIds = input.map((i) => i.id);
      const count = await ctx.prisma.todoList.count({
        where: {
          id: { in: listIds },
          userId: ctx.userId,
        },
      });

      if (count !== input.length) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.prisma.$transaction(
        input.map(({ id, order }) =>
          ctx.prisma.todoList.update({
            where: { id },
            data: { order },
          }),
        ),
      );

      return { success: true, updated: input };
    }),
});