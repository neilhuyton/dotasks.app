// server/routers/verifyEmail.ts

import { publicProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const verifyEmailRouter = router({
  verifyEmail: publicProcedure
    .input(
      z.object({
        token: z
          .string()
          .uuid({ message: "Invalid verification token format" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { token } = input;

      const user = await ctx.prisma.user.findFirst({
        where: { verificationToken: token },
        select: {
          id: true,
          isEmailVerified: true,
          email: true, // for potential logging/context
        },
      });

      if (!user) {
        const alreadyVerified = await ctx.prisma.user.findFirst({
          where: {
            verificationToken: null,
            isEmailVerified: true,
          },
          select: { id: true },
        });

        if (alreadyVerified) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This verification link has already been used or the email is verified.",
          });
        }

        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired verification token.",
        });
      }


      if (user.isEmailVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email is already verified.",
        });
      }


      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          verificationToken: null,
        },
      });

      return {
        message: "Email verified successfully! You can now log in.",
        email: user.email,
      };
    }),
});
