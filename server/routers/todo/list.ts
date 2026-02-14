// server/routers/todo/list.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc-base';
import { TRPCError } from '@trpc/server';

export const listRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.todoList.findMany({
      where: { userId: ctx.userId },          // ← changed from ctx.user.id
      orderBy: { createdAt: 'asc' },
    });
  }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const list = await ctx.prisma.todoList.findUnique({
        where: { id: input.id },
      });

      if (!list || list.userId !== ctx.userId) {   // ← changed
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return list;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().max(1000).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.todoList.create({
        data: {
          ...input,
          userId: ctx.userId,          // ← changed
        },
      });
    }),

  // same for update/delete if you add them
});