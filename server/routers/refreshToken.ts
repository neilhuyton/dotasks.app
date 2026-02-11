// server/routers/refreshToken.ts
import { publicProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

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

      // Find the specific refresh token record
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

      if (!process.env.JWT_SECRET) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server configuration error",
        });
      }

      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );

      // Rotate: create new refresh token (old one can stay or be deleted)
      // Here we keep the old one → allows multi-device
      // Alternative: delete old one → per-device rotation only
      const newRefreshToken = crypto.randomUUID();
      const newHashedRefresh = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      await ctx.prisma.refreshToken.create({
        data: {
          hashedToken: newHashedRefresh,
          userId: user.id,
          // expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 
        },
      });

      // Optional: delete used token (still allows multiple devices if they refresh independently)
      // await ctx.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        message: "Tokens refreshed successfully",
      };
    }),
});
