// server/trpc-base.ts

import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware to inject Supabase JWT claims so auth.uid() works in RLS policies
// This fixes the prod-only permission denied → UNAUTHORIZED issue
const rlsClaimsMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  try {
    await ctx.prisma.$executeRawUnsafe(`
      SELECT set_config('request.jwt.claims', ${JSON.stringify({
        role: 'authenticated',
        sub: ctx.userId,
      })}, true);

      SET LOCAL role = 'authenticated';
    `);
  } catch (err) {
    console.error('RLS claims injection failed:', err);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to set up authenticated session for RLS',
    });
  }

  return next();
});

// Protected procedures now use both middlewares
export const protectedProcedure = t.procedure
  .use(rlsClaimsMiddleware)  // ← this is the key line that makes prod work
  .use(({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
      },
    });
  });

export const createCallerFactory = t.createCallerFactory;