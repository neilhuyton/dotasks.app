// __tests__/utils/testCaller.ts

import { vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

import { createCaller } from '../../server/trpc';
import type { Context } from '../../server/context';

// Deep mock of the full PrismaClient
export const mockPrisma = mockDeep<PrismaClient>();

export function resetPrismaMocks() {
  vi.clearAllMocks();
}

// For public procedures (no authentication)
export function createPublicCaller(overrides: Partial<Context> = {}) {
  return createCaller({
    userId: undefined,           // ← fixed: use undefined instead of null
    prisma: mockPrisma,
    // If your real Context has other required/optional fields, set defaults here
    // e.g.:
    // session: null,
    // req: {} as any,
    // res: {} as any,
    ...overrides,
  });
}

// For protected procedures (with fake authenticated user)
export function createProtectedCaller(overrides: Partial<Context> = {}) {
  return createCaller({
    userId: 'test-user-id',
    prisma: mockPrisma,
    ...overrides,
  });
}