// server/context.ts
import { PrismaClient } from "@prisma/client";
import { jwtVerify, createRemoteJWKSet } from "jose";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};
export const prisma = (globalForPrisma.prisma ??= new PrismaClient());

export interface Context {
  prisma: PrismaClient;
  userId: string | null;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);
const ISSUER = `${SUPABASE_URL}/auth/v1`;

function extractToken(req: Request): string | null {
  const header =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function createContext({
  req,
}: {
  req: Request;
}): Promise<Context> {
  const token = extractToken(req);
  if (!token) {
    return { prisma, userId: null };
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: "authenticated",
    });

    const userId = typeof payload.sub === "string" ? payload.sub : null;
    return { prisma, userId };
  } catch {
    return { prisma, userId: null };
  }
}
