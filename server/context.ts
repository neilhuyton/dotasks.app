// server/context.ts

import { PrismaClient } from "@prisma/client";
import { jwtVerify, createRemoteJWKSet } from "jose";

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

const jwksUrl = new URL(
  `${process.env.SUPABASE_URL!}/auth/v1/.well-known/jwks.json`,
);
console.log("[context init] JWKS URL:", jwksUrl.toString()); // Log once on load

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

  if (!authHeader) {
    console.log(
      "[DEBUG] Authorization missing - forcing test userId for debug",
    );
    userId = "835dfe4d-5a7b-4ee7-b5b7-d3c4e03915bd"; // your user sub from token
    email = "dotasks@nehu.me";
    return { prisma, userId, email };
  }

  console.log(
    "[context] Full headers:",
    Object.fromEntries(req.headers.entries()),
  ); // Log ALL headers
  console.log("[context] Received Authorization header:", authHeader);

  if (
    typeof authHeader !== "string" ||
    !authHeader?.toLowerCase().startsWith("bearer ")
  ) {
    console.log(
      "[context] No valid Bearer token found (header missing or invalid format)",
    );
    return { prisma, userId, email };
  }

  const token = authHeader.slice(7).trim();

  console.log(
    "[context] Extracted token (first 20 chars):",
    token.slice(0, 20) + "...",
  );

  try {
    const verificationResult = await jwtVerify(token, JWKS, {
      issuer: `${process.env.SUPABASE_URL!}/auth/v1`,
      audience: "authenticated",
    });

    const payload = verificationResult.payload;

    console.log("[context] JWT payload:", payload); // Log claims

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
    console.error("[context] JWT verification failed:", {
      name: err.name,
      message: err.message,
      // stack: err.stack, // Uncomment for full trace in logs
    });
  }

  return { prisma, userId, email };
}
