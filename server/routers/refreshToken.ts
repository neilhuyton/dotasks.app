// server/routers/refreshToken.ts

import { publicProcedure, router } from "@/../server/trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { signSupabaseJwt } from "./auth-helpers";

export const refreshTokenRouter = router({
  refresh: publicProcedure
    .input(
      z.object({
        refreshToken: z.uuid({ message: "Invalid refresh token format" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { refreshToken } = input;

      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const tokenRecord = await ctx.prisma.refreshToken.findUnique({
        where: { hashedToken: hashedRefresh },
        include: { user: { select: { id: true, email: true } } },
      });

      if (!tokenRecord || !tokenRecord.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired refresh token",
        });
      }

      const user = tokenRecord.user;

      const newAccessToken = signSupabaseJwt({
        userId: user.id,
        email: user.email,
      });

      const newRefreshToken = crypto.randomUUID();
      const newHashedRefresh = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      await ctx.prisma.$transaction(async (tx) => {
        await tx.refreshToken.delete({
          where: { hashedToken: hashedRefresh },
        });

        await tx.refreshToken.create({
          data: {
            hashedToken: newHashedRefresh,
            userId: user.id,
          },
        });
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        message: "Tokens refreshed successfully",
      };
    }),
});
