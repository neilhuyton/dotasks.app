// server/routers/verification.ts

import { publicProcedure, router } from "../trpc-base";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { sendVerificationEmail } from "../email"; // your existing email sender

export const verificationRouter = router({
  resendVerificationEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email().trim().toLowerCase(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      const user = await ctx.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          isEmailVerified: true,
          verificationToken: true,
        },
      });

      if (!user) {
        // Don't reveal if email exists → security best practice
        return {
          success: true,
          message: "If the email exists, a verification link has been sent.",
        };
      }

      if (user.isEmailVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This email is already verified.",
        });
      }

      // Generate fresh token (invalidate old one implicitly by overwriting)
      const newToken = crypto.randomUUID();

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: newToken },
      });


      // Send email (non-blocking)
      try {
        await sendVerificationEmail(email, newToken);
      } catch (err) {
        console.error("Failed to resend verification email", { email, err });
        // Still return success to user — don't leak failure
      }

      return {
        success: true,
        message: "Verification email resent. Please check your inbox/spam.",
      };
    }),
});
