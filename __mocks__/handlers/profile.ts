// __mocks__/handlers/profile.ts

import { trpcMsw } from "../trpcMsw";
import { http, HttpResponse } from "msw";

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// ────────────────────────────────────────────────
// tRPC handlers
// ────────────────────────────────────────────────

export const getCurrentUserHandler = trpcMsw.user.getCurrent.query(() => {
  return {
    id: TEST_USER_ID,
    email: "testuser@example.com",
  };
});

export const updateEmailSuccessHandler = trpcMsw.user.updateEmail.mutation(
  ({ input }) => {
    return {
      message: "Email updated successfully",
      email: input.email,
    };
  },
);

export const updateEmailHandler = trpcMsw.user.updateEmail.mutation(() => {
  throw new Error("Email already in use or invalid");
});

export const sendPasswordResetHandler = trpcMsw.resetPassword.request.mutation(
  () => {
    return {
      message: "Password reset link sent. Check your email.",
    };
  },
);

export const userCreateOrSyncHandler = trpcMsw.user.createOrSync.mutation(() => {
  return {
    success: true,
    message: "User created or synced successfully",
    user: {
      id: TEST_USER_ID,
      email: "testuser@example.com",
    },
  };
});

// ────────────────────────────────────────────────
// Supabase handlers
// ────────────────────────────────────────────────

export const supabaseUpdateEmailSuccess = http.put(
  "*/auth/v1/user",
  async ({ request }) => {
    const body = (await request.json()) as { email: string };
    await new Promise((r) => setTimeout(r, 400));

    if (body.email === "already.taken@example.com") {
      return HttpResponse.json(
        { error: { message: "Email address already taken" } },
        { status: 422 },
      );
    }

    return HttpResponse.json(
      {
        id: TEST_USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: body.email,
        email_confirmed_at: new Date().toISOString(),
      },
      { status: 200 },
    );
  },
);

export const supabaseUpdateEmailTaken = http.put(
  "*/auth/v1/user",
  async () => {
    await new Promise((r) => setTimeout(r, 300));
    return HttpResponse.json(
      { error: { message: "Email address already taken" } },
      { status: 422 },
    );
  },
);

export const supabaseUpdateEmailDelayed = http.put("*/auth/v1/user", async () => {
  await new Promise((r) => setTimeout(r, 1400)); // ← increased from 1000 → more reliable in CI
  return HttpResponse.json(
    {
      id: TEST_USER_ID,
      email: "delayed.success@example.com",
    },
    { status: 200 },
  );
});

export const supabaseUpdateEmailForbidden = http.put("*/auth/v1/user", () => {
  return HttpResponse.json(
    { code: 403, msg: "Forbidden", error: "Invalid JWT or unauthorized" },
    { status: 403 },
  );
});