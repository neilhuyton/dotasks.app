// __mocks__/handlers/register.ts
import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw"; // same path as in your weight.ts
import bcrypt from "bcryptjs";
import crypto from "crypto";

// In-memory mock users (shared state)
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

export const registerHandler = trpcMsw.register.mutation(({ input }) => {
  const { email, password } = input;

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
    refreshToken: crypto.randomUUID(), // or null if not issued on register
    resetPasswordTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  };

  mockUsers.push(newUser);

  // Return the shape your real register procedure returns
  return {
    user: {
      id: newUser.id,
      email: newUser.email,
    },
    accessToken: crypto.randomUUID(), // mock a JWT or token; adjust if you generate real one
    refreshToken: newUser.refreshToken ?? crypto.randomUUID(),
    message: "Registration successful! Please check your email to verify your account.",
  };
});

export const registerHandlers = [registerHandler];