// __mocks__/handlers/login.ts
import { http, HttpResponse } from "msw";
import { mockUsers, type MockUser } from "../mockUsers";
import bcrypt from "bcryptjs";
import { invalidJsonResponse, badRequestResponse } from "./utils";

export const loginHandler = http.post("/trpc/login", async ({ request }) => {
  await new Promise((resolve) => setTimeout(resolve, 50));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse('login');
  }

  const input =
    body && typeof body === "object" && "0" in body
      ? body["0"]
      : Array.isArray(body) && body[0]?.json
        ? body[0].json
        : body;

  if (!input || !input.email || !input.password) {
    return badRequestResponse("Invalid email or password", "login");
  }

  const { email, password } = input;

  const user = mockUsers.find((u: MockUser) => u.email === email);
  if (!user) {
    return badRequestResponse("Invalid email or password", "login");
  }

  if (!user.isEmailVerified) {
    return badRequestResponse("Please verify your email before logging in", "login");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return badRequestResponse("Invalid email or password", "login");
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