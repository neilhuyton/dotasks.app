// server/context.ts

import { PrismaClient } from "@prisma/client";
import { jwtVerify, createRemoteJWKSet } from "jose";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = new PrismaClient());

export interface Context {
  prisma: PrismaClient;
  userId: string | null;
  email: string | null;
}

export type AuthenticatedContext = Context & {
  userId: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error("Missing required environment variable: SUPABASE_URL");
}

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

const SUPABASE_ISSUER = `${SUPABASE_URL}/auth/v1`;

function extractBearerToken(req: Request): string | null {
  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("Authorization");

  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

interface SupabaseJwtPayload {
  sub?: string;
  email?: string;
  [key: string]: unknown;
}

async function verifySupabaseToken(token: string): Promise<{
  userId: string | null;
  email: string | null;
}> {
  try {
    const { payload } = await jwtVerify<SupabaseJwtPayload>(token, JWKS, {
      issuer: SUPABASE_ISSUER,
      audience: "authenticated",
    });

    const userId =
      typeof payload.sub === "string" && payload.sub ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;

    return { userId, email };
  } catch {
    return { userId: null, email: null };
  }
}

export async function createContext({
  req,
}: {
  req: Request;
}): Promise<Context> {
  const token = extractBearerToken(req);

  // ────────────────────────────────────────────────────────────────
  // TEMPORARY DEBUG LOG - remove after diagnosing 401 on refresh
  console.log("[tRPC createContext]", {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    verifiedUserId: null as string | null,
    verifiedEmail: null as string | null,
  });
  // ────────────────────────────────────────────────────────────────

  if (!token) {
    return { prisma, userId: null, email: null };
  }

  const { userId, email } = await verifySupabaseToken(token);

  // ────────────────────────────────────────────────────────────────
  // TEMPORARY DEBUG LOG - update with actual verification result
  console.log("[tRPC createContext]", {
    hasToken: !!token,
    tokenLength: token.length,
    verifiedUserId: userId,
    verifiedEmail: email,
  });
  // ────────────────────────────────────────────────────────────────

  return { prisma, userId, email };
}

export function requireAuth(ctx: Context): AuthenticatedContext {
  if (!ctx.userId) {
    throw new Error("Authentication required");
  }
  return ctx as AuthenticatedContext;
}