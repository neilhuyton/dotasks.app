// __mocks__/handlers/register.ts
import { http, HttpResponse } from "msw";
import { mockUsers } from "../mockUsers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { inferProcedureInput } from "@trpc/server";
import type { AppRouter } from "../../server/trpc";

interface TrpcRequestBody {
  "0": inferProcedureInput<AppRouter["register"]>; // { email: string, password: string }
}

export const registerHandler = http.post(
  "/trpc/register",
  async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid request body",
              code: -32600,
              data: { code: "BAD_REQUEST", httpStatus: 400, path: "register" },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (!body || typeof body !== "object" || !("0" in body)) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid request body",
              code: -32600,
              data: { code: "BAD_REQUEST", httpStatus: 400, path: "register" },
            },
          },
        ],
        { status: 200 },
      );
    }

    const input = (body as TrpcRequestBody)["0"];
    const { email, password } = input || {};

    if (!email || !password) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Email and password are required",
              code: -32603,
              data: { code: "BAD_REQUEST", httpStatus: 400, path: "register" },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (!email.includes("@")) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Invalid email address",
              code: -32001,
              data: { code: "BAD_REQUEST", httpStatus: 400, path: "register" },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (password.length < 8) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Password must be at least 8 characters",
              code: -32001,
              data: { code: "BAD_REQUEST", httpStatus: 400, path: "register" },
            },
          },
        ],
        { status: 200 },
      );
    }

    if (mockUsers.find((u) => u.email === email)) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: "Email already exists",
              code: -32603,
              data: { code: "BAD_REQUEST", httpStatus: 400, path: "register" },
            },
          },
        ],
        { status: 200 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      verificationToken: crypto.randomUUID(),
      isEmailVerified: false,
      resetPasswordToken: null,
      resetPasswordTokenExpiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);

    return HttpResponse.json(
      [
        {
          id: 0,
          result: {
            data: {
              id: newUser.id,
              email: newUser.email,
              message:
                "Registration successful! Please check your email to verify your account.",
            },
          },
        },
      ],
      { status: 200 },
    );
  },
);
