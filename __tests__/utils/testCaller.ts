// __tests__/utils/testCaller.ts

import { vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

import { createCaller } from '../../server/trpc';
import type { Context } from '../../server/context';

// Create a deep mock of PrismaClient
export const mockPrisma = mockDeep<PrismaClient>();

// Make $transaction behave like the real one:
// - If called with a function, execute it with the mock as the transaction client
// - This is the key fix for setCurrent (and any future transactional procedures)
mockPrisma.$transaction.mockImplementation(async (arg) => {
  if (typeof arg === 'function') {
    // Pass the same mockPrisma as the transaction client (tx)
    return arg(mockPrisma);
  }
  // If used with array of operations (rare), we could handle it too — but for now keep simple
  throw new Error('$transaction called with unsupported format in tests');
});

// Reset all mocks (useful in beforeEach)
export function resetPrismaMocks() {
  vi.clearAllMocks();
  // Optionally re-apply $transaction mock if needed after clear
  // (usually not necessary as mockImplementation survives clearAllMocks)
}

// Public caller — no authentication
export function createPublicCaller(overrides: Partial<Context> = {}) {
  return createCaller({
    userId: undefined,  // No user → public context
    prisma: mockPrisma,
    ...overrides,
  });
}

// Protected caller — fake authenticated user
export function createProtectedCaller(overrides: Partial<Context> = {}) {
  return createCaller({
    userId: 'test-user-id',  // Fixed fake user ID
    prisma: mockPrisma,
    ...overrides,
  });
}