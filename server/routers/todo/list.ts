// server/routers/todo/list.ts

import { z } from "zod";
import { router, protectedProcedure } from "../../trpc-base";
import { TRPCError } from "@trpc/server";

export const listRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.todoList.findMany({
      where: { userId: ctx.userId }, // ← changed from ctx.user.id
      orderBy: { createdAt: "desc" },
    });
  }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const list = await ctx.prisma.todoList.findUnique({
        where: { id: input.id },
      });

      if (!list || list.userId !== ctx.userId) {
        // ← changed
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
      return ctx.prisma.todoList.create({
        data: {
          ...input,
          userId: ctx.userId, // ← changed
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

      // Soft delete (recommended)
      // return ctx.prisma.todoList.update({
      //   where: { id: input.id },
      //   data: { isArchived: true },
      // });

      // OR hard delete:
      return ctx.prisma.todoList.delete({ where: { id: input.id } });
    }),
});
