import { vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { PrismaClient, Prisma } from "@prisma/client";

import { createCaller } from "../../server/trpc";
import type { Context } from "../../server/context";

export const mockPrisma = mockDeep<PrismaClient>();

type TransactionArg =
  | ((tx: Prisma.TransactionClient) => Promise<unknown>)
  | Prisma.PrismaPromise<unknown>[];


mockPrisma.$transaction.mockImplementation(async (arg: TransactionArg) => {
  if (typeof arg === "function") {

    return arg(mockPrisma as Prisma.TransactionClient);
  }

  if (Array.isArray(arg)) {

    const results: unknown[] = [];
    for (const op of arg) {
      const result = await op;
      results.push(result);
    }
    return results;
  }

  throw new Error("$transaction called with unsupported format in tests");
});

export function resetPrismaMocks() {
  vi.clearAllMocks();
}

export function createPublicCaller(overrides: Partial<Context> = {}) {
  return createCaller({
    prisma: mockPrisma,
    userId: null, 
    ...overrides,
  });
}

export function createProtectedCaller(overrides: Partial<Context> = {}) {
  return createCaller({
    prisma: mockPrisma,
    userId: "test-user-id",
    ...overrides,
  });
}
