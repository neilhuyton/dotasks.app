// __mocks__/handlers/auth.ts

import { trpcMsw } from "../trpcMsw";
import { mockUsers } from "../mockUsers";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface LoginInput {
  email: string;
  password: string;
}

interface RefreshInput {
  refreshToken: string;
}

// ────────────────────────────────────────────────
// Login handler — now using same simple pattern as register
// ────────────────────────────────────────────────

export const loginHandler = trpcMsw.login.mutation(async ({ input }) => {
  await delay(50);

  // Same safe extraction pattern as your register handler
  const rawInput = "0" in input ? input["0"] : input;
  const typedInput = rawInput as Partial<LoginInput> | undefined;

  const email = (typedInput?.email ?? "").trim().toLowerCase();
  const password = typedInput?.password ?? "";

  if (!email || !password) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Email and password are required",
    });
  }

  const user = mockUsers.find((u) => u.email === email);

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid email or password",
    });
  }

  if (!user.isEmailVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Please verify your email before logging in",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid email or password",
    });
  }

  const accessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSJ9.dummy-signature";

  const refreshToken = (user.refreshToken ?? crypto.randomUUID()) as `${string}-${string}-${string}-${string}-${string}`;

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    accessToken,
    refreshToken,
    message: "Login successful",
  };
});

// ────────────────────────────────────────────────
// Refresh token handler — same pattern
// ────────────────────────────────────────────────

export const refreshTokenHandler = trpcMsw.refreshToken.refresh.mutation(async ({ input }) => {
  await delay(30);

  // Same safe extraction pattern
  const rawInput = "0" in input ? input["0"] : input;
  const typedInput = rawInput as Partial<RefreshInput> | undefined;

  const refreshToken = typedInput?.refreshToken ?? "";

  if (!refreshToken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Refresh token is required",
    });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refreshToken)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid refresh token format",
    });
  }

  const user = mockUsers.find((u) => u.refreshToken === refreshToken);

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired refresh token",
    });
  }

  const newAccessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshed.${user.id}.mock-signature`;

  const newRefreshToken = crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`;

  user.refreshToken = newRefreshToken;

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    message: "Tokens refreshed successfully",
  };
});

export const authHandlers = [loginHandler, refreshTokenHandler];