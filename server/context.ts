import { PrismaClient } from "@prisma/client";
import { createServerClient } from "@supabase/ssr";
// Remove this import — we no longer need IncomingMessage
// import type { IncomingMessage } from "http";

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
  req: Request;   // ← Important: use the web Fetch Request type here
}): Promise<Context> {
  let userId: string | null = null;
  let email: string | null = null;

  // Use .get() — this is how you access headers on a web Request
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");

  // ────────────────────────────────────────────────
  // Add these logs — they will appear in Netlify function logs
  console.log("[context] Received Authorization header:", authHeader);
  // ────────────────────────────────────────────────

  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    console.log("[context] No valid Bearer token → public/unauthenticated context");
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
            // No-op
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error("[context] supabase.auth.getUser failed:", error.message, error.code);
    }

    if (!error && user) {
      userId = user.id;
      email = user.email ?? null;
      console.log("[context] Authenticated user:", user.id, user.email);
    } else {
      console.log("[context] getUser returned no user");
    }
  } catch (err) {
    console.error("[context] Unexpected error during auth:", err);
  }

  return { prisma, userId, email };
}