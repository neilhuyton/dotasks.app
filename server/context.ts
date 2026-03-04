import { PrismaClient } from "@prisma/client";
import { jwtVerify, createRemoteJWKSet, type JWTVerifyResult } from "jose";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  prisma = globalForPrisma.prisma;
}

export interface Context {
  prisma: PrismaClient;
  userId: string | null;
  email: string | null;
}

// Remote JWKS set – fetches public keys dynamically from your Supabase project
const jwksUrl = new URL(
  `${process.env.SUPABASE_URL!}/auth/v1/.well-known/jwks.json`,
);
const JWKS = createRemoteJWKSet(jwksUrl);

export async function createContext({
  req,
}: {
  req: Request;
}): Promise<Context> {
  let userId: string | null = null;
  let email: string | null = null;

  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("Authorization");

  console.log("[context] Received Authorization header:", authHeader);

  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    console.log(
      "[context] No valid Bearer token found → unauthenticated context",
    );
    return { prisma, userId, email };
  }

  const token = authHeader.slice(7).trim();

  try {
    const verificationResult: JWTVerifyResult = await jwtVerify(token, JWKS, {
      issuer: `${process.env.SUPABASE_URL!}/auth/v1`,
      audience: "authenticated",
    });

    const payload = verificationResult.payload;

    if (typeof payload.sub === "string" && payload.sub) {
      userId = payload.sub;
      email = typeof payload.email === "string" ? payload.email : null;
      console.log("[context] JWT verified successfully → user:", {
        userId,
        email,
      });
    } else {
      console.log("[context] JWT verified but missing/invalid sub claim");
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error("[context] JWT verification failed:", {
        name: err.name,
        message: err.message,
        // stack: err.stack,  // Uncomment only for deeper debugging
      });
    } else {
      console.error(
        "[context] JWT verification failed (non-Error thrown):",
        err,
      );
    }
  }

  return { prisma, userId, email };
}
