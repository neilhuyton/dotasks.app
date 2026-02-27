// __tests__/utils/testCaller.ts

import { vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { PrismaClient, Prisma } from "@prisma/client";

import { createCaller } from "../../server/trpc";
import type { Context } from "../../server/context";

// Deep mock of the entire PrismaClient
export const mockPrisma = mockDeep<PrismaClient>();

// Helper type for transaction arguments (most common patterns)
type TransactionArg =
  | ((tx: Prisma.TransactionClient) => Promise<unknown>)
  | Prisma.PrismaPromise<unknown>[];

// Make $transaction behave realistically in tests
mockPrisma.$transaction.mockImplementation(async (arg: TransactionArg) => {
  if (typeof arg === "function") {
    // Single transaction function → pass the mock as tx
    return arg(mockPrisma as Prisma.TransactionClient);
  }

  if (Array.isArray(arg)) {
    // Array of Prisma promises → execute them sequentially
    const results: unknown[] = [];
    for (const op of arg) {
      const result = await op;
      results.push(result);
    }
    return results;
  }

  throw new Error("$transaction called with unsupported format in tests");
});

// Reset all mocks between tests
export function resetPrismaMocks() {
  vi.clearAllMocks();
}

/**
 * Creates a public (unauthenticated) caller for testing public procedures.
 */
export function createPublicCaller(overrides: Partial<Context> = {}) {
  return createCaller({
    prisma: mockPrisma,
    userId: null, // Explicit null for unauthenticated
    email: null, // Provide null if email is part of Context
    // Add other required context fields with defaults if necessary
    ...overrides,
  });
}

/**
 * Creates a protected (authenticated) caller with a fake user.
 * Use this for most of your protected router tests.
 */
export function createProtectedCaller(overrides: Partial<Context> = {}) {
  return createCaller({
    prisma: mockPrisma,
    userId: "test-user-id",
    email: "test-user@example.com", // fake email – adjust if your auth uses different field
    // Add other context fields your middleware/context expects (session, etc.)
    ...overrides,
  });
}
