// server/context.ts
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import type { IncomingMessage } from "http";

// ───────────────────────────────────────────────
// Prisma (per-request in production/serverless, cached in dev only)
let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // Safe globalThis access in dev
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  prisma = globalForPrisma.prisma ?? new PrismaClient();
  globalForPrisma.prisma = prisma;
}

// ───────────────────────────────────────────────
export interface AuthJwtPayload {
  sub?: string;
  user_id?: string; // some JWTs use user_id
  userId?: string; // common custom field
  email?: string;
  // Minimal set — we don't assume other fields exist
}

export interface Context {
  prisma: PrismaClient;
  userId: string | null;
  email: string | null;
}

export async function createContext({
  req,
}: {
  req: IncomingMessage;
}): Promise<Context> {
  let userId: string | null = null;
  let email: string | null = null;

  const authHeader = req.headers.authorization;

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    const secret = process.env.SUPABASE_JWT_SECRET;

    if (!secret) {
      console.warn("SUPABASE_JWT_SECRET is not set → authentication disabled");
    } else {
      try {
        const decoded = jwt.verify(token, secret);

        // Type narrowing: must be object (jwt.verify never returns string/Buffer with RS256 etc.)
        if (decoded !== null && typeof decoded === "object") {
          const claims = decoded as AuthJwtPayload;

          // Prefer sub (standard JWT / Supabase) → then fallbacks
          userId =
            typeof claims.sub === "string"
              ? claims.sub
              : typeof claims.userId === "string"
                ? claims.userId
                : typeof claims.user_id === "string"
                  ? claims.user_id
                  : null;

          // Email — only if it's a non-empty string
          if (typeof claims.email === "string" && claims.email.length > 0) {
            email = claims.email;
          }
        }
      } catch (err) {
        // Swallow auth errors — context stays unauthenticated
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[auth] JWT verification failed: ${msg}`);
      }
    }
  }

  return {
    prisma,
    userId,
    email,
  };
}
