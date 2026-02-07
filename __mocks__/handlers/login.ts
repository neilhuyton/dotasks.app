// __mocks__/handlers/login.ts
import { http, HttpResponse } from "msw";
import { mockUsers, type MockUser } from "../mockUsers";
import bcrypt from "bcryptjs";

export const loginHandler = http.post("/trpc/login", async ({ request }) => {
  await new Promise((resolve) => setTimeout(resolve, 50));
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
            data: { code: "BAD_REQUEST", httpStatus: 400, path: "login" },
          },
        },
      ],
      { status: 200 },
    );
  }

  const input =
    body && typeof body === "object" && "0" in body
      ? body["0"]
      : Array.isArray(body) && body[0]?.json
        ? body[0].json
        : body;

  if (!input || !input.email || !input.password) {
    return HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message: "Invalid email or password",
            code: -32600,
            data: { code: "BAD_REQUEST", httpStatus: 400, path: "login" },
          },
        },
      ],
      { status: 200 },
    );
  }

  const { email, password } = input;

  const user = mockUsers.find((u: MockUser) => u.email === email);
  if (!user) {
    return HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message: "Invalid email or password",
            code: -32602,
            data: { code: "BAD_REQUEST", httpStatus: 400, path: "login" },
          },
        },
      ],
      { status: 200 },
    );
  }

  if (!user.isEmailVerified) {
    return HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message: "Please verify your email before logging in",
            code: -32602,
            data: { code: "BAD_REQUEST", httpStatus: 400, path: "login" },
          },
        },
      ],
      { status: 200 },
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message: "Invalid email or password",
            code: -32602,
            data: { code: "BAD_REQUEST", httpStatus: 400, path: "login" },
          },
        },
      ],
      { status: 200 },
    );
  }

  return HttpResponse.json(
    [
      {
        id: 0,
        result: {
          type: "data",
          data: {
            id: user.id,
            email: user.email,
            token:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSJ9.dummy-signature",
            refreshToken: user.refreshToken || "mock-refresh-token",
          },
        },
      },
    ],
    { status: 200 },
  );
});
