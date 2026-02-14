// server/context.ts

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'http';

// ───────────────────────────────────────────────
// 1. Prisma in serverless → better to create per-request
//    (avoids connection pool exhaustion & stale connections)
const prisma = globalThis.prisma ?? new PrismaClient();

console.log("DATABASE_URL present?", !!process.env.DATABASE_URL);
console.log("DB host:", process.env.DATABASE_URL?.split('@')[1] || "missing");

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// ───────────────────────────────────────────────
export type Context = {
  prisma: PrismaClient;
  userId?: string;
  email?: string;
};

export async function createContext({ req }: { req: IncomingMessage }): Promise<Context> {
  let userId: string | undefined;
  let email: string | undefined;

  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];

    try {
      const secret = process.env.JWT_SECRET;

      if (!secret) {
        console.warn('JWT_SECRET is not set — authentication disabled');
        // You might want to throw in development
      } else {
        const decoded = jwt.verify(token, secret) as {
          userId: string;
          email: string;
          iat?: number;
          exp?: number;
          // ... other claims you use
        };

        userId = decoded.userId;
        email = decoded.email;
      }
    } catch (err) {
      console.debug('Invalid JWT', (err as Error).message);
    }
  }

  return {
    prisma,
    userId,
    email,
  };
}