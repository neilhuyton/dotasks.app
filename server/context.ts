import { PrismaClient } from "@prisma/client";
import {
  extractToken,
  verifyTokenAndGetUserId,
} from "@steel-cut/trpc-shared/server";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};
export const prisma = (globalForPrisma.prisma ??= new PrismaClient());

export interface Context {
  prisma: PrismaClient;
  userId: string | null;
}

export async function createContext({
  req,
}: {
  req: Request;
}): Promise<Context> {
  const token = extractToken(req);
  const userId = await verifyTokenAndGetUserId(token);
  return { prisma, userId };
}
