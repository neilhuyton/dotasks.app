// server/context.ts

import { PrismaClient } from "@prisma/client";
import { createServerClient } from "@supabase/ssr";
import type { IncomingMessage } from "http";

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

export async function createContext({
  req,
}: {
  req: IncomingMessage;
}): Promise<Context> {
  let userId: string | null = null;
  let email: string | null = null;

  const authHeader = req.headers.authorization;

  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return { prisma, userId, email };
  }

  const token = authHeader.slice(7).trim();

  try {
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op: we never set cookies in this context
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      userId = user.id;
      email = user.email ?? null;
    }
  } catch {
    // Silently fail → unauthenticated context
  }

  return { prisma, userId, email };
}