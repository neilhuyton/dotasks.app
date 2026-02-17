import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ────────────────────────────────────────────────
// Delay only in test environment
const isTestEnv = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
const TEST_DELAY_MS = 600; // Adjust if needed (400–800 ms usually works well)
// ────────────────────────────────────────────────

export let mockUsers: {
  id: string;
  email: string;
  password: string; // hashed
  verificationToken: string;
  isEmailVerified: boolean;
  resetPasswordToken: string | null;
  refreshToken: string | null;
  resetPasswordTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}[] = [];

export function resetMockUsers() {
  mockUsers = [];
}

interface RegisterInput {
  email: string;
  password: string;
}

export const registerHandler = trpcMsw.register.mutation(async ({ input }) => {
  // Artificial delay for tests – makes loading states visible
  if (isTestEnv) {
    await new Promise((resolve) => setTimeout(resolve, TEST_DELAY_MS));
  }

  const rawInput = '0' in input ? input['0'] : input;
  const typedInput = rawInput as RegisterInput | undefined;

  const email = typedInput?.email ?? "";
  const password = typedInput?.password ?? "";

  if (!email || !password) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Email and password are required",
    });
  }

  if (!email.includes("@")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid email address",
    });
  }

  if (password.length < 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Password must be at least 8 characters",
    });
  }

  if (mockUsers.find((u) => u.email === email)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Email already exists",
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const now = new Date();

  const newUser = {
    id: crypto.randomUUID(),
    email,
    password: hashedPassword,
    verificationToken: crypto.randomUUID(),
    isEmailVerified: false,
    resetPasswordToken: null,
    refreshToken: crypto.randomUUID(),
    resetPasswordTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  };

  mockUsers.push(newUser);

  return {
    user: {
      id: newUser.id,
      email: newUser.email,
    },
    accessToken: crypto.randomUUID(),
    refreshToken: newUser.refreshToken,
    message: "Registration successful! Please check your email to verify your account.",
  };
});

export const registerHandlers = [registerHandler];