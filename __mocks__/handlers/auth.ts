import { trpcMsw } from "../trpcMsw";
import { mockUsers, type MockUser } from "../mockUsers";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

// Simulate realistic network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface LoginInput {
  email: string;
  password: string;
}

interface RefreshInput {
  refreshToken: string;
}

export const loginHandler = trpcMsw.login.mutation(async ({ input }) => {
  await delay(50);

  // Handle tRPC's batched/wrapped input shape: { "0": { email, password } }
  const rawInput = '0' in input ? input['0'] : input;

  // Safely extract with fallback
  const email = (rawInput as LoginInput | undefined)?.email ?? '';
  const password = (rawInput as LoginInput | undefined)?.password ?? '';

  console.log('[MOCK LOGIN] Received input (after unwrap):', { email, password });

  if (!email || !password) {
    console.log('[MOCK LOGIN] Missing email/password');
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid email or password" });
  }

  const user = mockUsers.find((u: MockUser) => u.email === email);
  console.log('[MOCK LOGIN] Found user?', !!user, user?.email || 'not found');

  if (!user) {
    console.log('[MOCK LOGIN] User not found for email:', email);
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
  }

  if (!user.isEmailVerified) {
    console.log('[MOCK LOGIN] Email not verified for:', email);
    throw new TRPCError({ code: "FORBIDDEN", message: "Please verify your email before logging in" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  console.log(
    '[MOCK LOGIN] Password valid?',
    isPasswordValid,
    ' (input pw length:',
    password.length,
    ')'
  );

  if (!isPasswordValid) {
    console.log('[MOCK LOGIN] Password mismatch for user:', email);
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
  }

  const accessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSJ9.dummy-signature";

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    accessToken,
    refreshToken: (user.refreshToken ??
      "550e8400-e29b-41d4-a716-446655440000") as `${string}-${string}-${string}-${string}-${string}`,
    message: "Login successful",
  };
});

export const refreshTokenHandler = trpcMsw.refresh.mutation(async ({ input }) => {
  await delay(30);

  // Handle possible wrapped shape (though usually not batched for refresh)
  const rawInput = '0' in input ? input['0'] : input;

  const refreshToken = (rawInput as RefreshInput | undefined)?.refreshToken ?? '';

  if (!refreshToken || !refreshToken.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
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

  const newAccessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshed.${user.id}.signature`;

  // Mock rotation with a new valid-looking UUID
  const newRefreshToken = "550e8400-e29b-41d4-a716-446655440001" as `${string}-${string}-${string}-${string}-${string}`;

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    message: "Tokens refreshed successfully",
  };
});

export const authHandlers = [loginHandler, refreshTokenHandler];