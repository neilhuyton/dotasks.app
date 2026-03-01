// __mocks__/mockUsers.ts

import { TEST_VERIFICATION_TOKENS } from "../__tests__/test-constants";

// Use real Date objects (Prisma returns Date, not string)
export interface MockUser {
  id: string;
  email: string;
  password: string;
  verificationToken: string | null;
  isEmailVerified: boolean;
  resetPasswordToken: string | null;
  resetPasswordTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Remove refreshToken unless you add it to User model later
  // refreshToken?: string | null;   ← commented out
}

export const mockUsers: MockUser[] = [
  {
    id: "test-user-1",
    email: "testuser@example.com",
    password: "$2b$10$BfZjnkEBinREhMQwsUwFjOdeidxX1dvXSKn.n3MxdwmRTcfV8JR16", // password123
    verificationToken: null,
    isEmailVerified: true,
    resetPasswordToken: null,
    resetPasswordTokenExpiresAt: null,
    createdAt: new Date("2025-08-16T10:40:39.214Z"),
    updatedAt: new Date("2025-08-16T10:40:39.214Z"),
  },
  {
    id: "verified-user-id",
    email: "verifieduser@example.com",
    password: "$2b$10$BfZjnkEBinREhMQwsUwFjOdeidxX1dvXSKn.n3MxdwmRTcfV8JR16",
    verificationToken: TEST_VERIFICATION_TOKENS.ALREADY_VERIFIED,
    isEmailVerified: true,
    resetPasswordToken: null,
    resetPasswordTokenExpiresAt: null,
    createdAt: new Date(), // or fixed date
    updatedAt: new Date(),
  },
  {
    id: "27e72eb9-a0ad-4714-bd7a-c148ac1b903e",
    email: "cool@example.com",
    password: "$2b$10$jEeurRBvzMKgzXNYqihFiedyVyMCJDlC293i/MYoY9IPVrWeZOhX",
    verificationToken: TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS,
    isEmailVerified: false,
    resetPasswordToken: TEST_VERIFICATION_TOKENS.RESET_PASSWORD_EXAMPLE,
    resetPasswordTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date("2025-08-16T10:40:39.214Z"),
    updatedAt: new Date("2025-08-16T11:10:39.214Z"),
  },
  {
    id: "fb208768-1bf8-4f8d-bcad-1f94c882ed93",
    email: "elvis@example.com",
    password: "$2b$10$RBmt.5/HTA/qk5Y47NYgvuZ5TA0AurgAUy0vDeytiUKsvZUeR.lrG",
    verificationToken: null,
    isEmailVerified: true,
    resetPasswordToken: null,
    resetPasswordTokenExpiresAt: null,
    createdAt: new Date("2025-08-16T19:57:56.561Z"),
    updatedAt: new Date("2025-08-16T19:58:22.721Z"),
  },
];

// Optional: helper to get a copy of a user by id or email
export function getMockUserById(id: string): MockUser | undefined {
  return mockUsers.find(u => u.id === id);
}

export function getMockUserByEmail(email: string): MockUser | undefined {
  return mockUsers.find(u => u.email === email);
}

export function createTestUser(overrides: Partial<MockUser> = {}): MockUser {
  const now = new Date();
  return {
    id: "user-" + Math.random().toString(36).slice(2),
    email: "user-" + Math.random().toString(36).slice(2) + "@example.com",
    password: "$2b$10$dummyhash....................",
    verificationToken: null,
    isEmailVerified: true,
    resetPasswordToken: null,
    resetPasswordTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Optional: named presets
export const TEST_USER = createTestUser({
  id: "test-user-123",
  email: "testuser@example.com",
  isEmailVerified: true,
});

export const TAKEN_EMAIL_USER = createTestUser({
  id: "other-user-999",
  email: "already.taken@example.com",
  isEmailVerified: true,
});

