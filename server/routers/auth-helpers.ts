// server/routers/auth-helpers.ts

import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";

export function signSupabaseJwt(payload: { userId: string; email: string }) {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing SUPABASE_JWT_SECRET environment variable",
    });
  }

  return jwt.sign(
    {
      sub: payload.userId, // ← becomes auth.uid() in Supabase
      email: payload.email,
      role: "authenticated",
      aud: "authenticated",
    },
    secret,
    { expiresIn: "15m" },
  );
}
