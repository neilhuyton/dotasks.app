// __tests__/routes/login.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../__mocks__/server";
import { trpcMsw } from "../../__mocks__/trpcMsw";
import { listGetAllHandler } from "../../__mocks__/handlers/lists";

import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/shared/store/authStore";
import { supabase } from "@/lib/supabase";
import { AuthError, type User } from "@supabase/supabase-js";

// Mock createOrSync with exact shape from your profile.ts
const createOrSyncHandler = trpcMsw.user.createOrSync.mutation(() => ({
  success: true,
  message: "User created or synced successfully",
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "testuser@example.com",
  },
}));

describe("LoginPage", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

  beforeEach(() => {
    server.resetHandlers();
    server.use(createOrSyncHandler, listGetAllHandler);

    useAuthStore.getState().signOut();

    // Default successful login - full User shape
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: {
          id: "test-user-123",
          email: "testuser@example.com",
          role: "authenticated",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: new Date().toISOString(),
        } satisfies User,
        session: {
          access_token: "mock-token",
          refresh_token: "mock-refresh",
          expires_in: 3600,
          token_type: "bearer", // ← ADD THIS LINE
          user: {
            id: "test-user-123",
            email: "testuser@example.com",
            role: "authenticated",
            aud: "authenticated",
            app_metadata: {},
            user_metadata: {},
            identities: [],
            created_at: new Date().toISOString(),
          } satisfies User,
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterAll(() => server.close());

  function renderLogin() {
    return renderWithProviders({ initialEntries: ["/login"] });
  }

  async function waitForFormReady() {
    await waitFor(
      () => {
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  }

  async function fillLoginForm(email: string, password: string) {
    await userEvent.type(screen.getByLabelText(/email/i), email);
    await userEvent.type(screen.getByLabelText(/password/i), password);
  }

  async function submitForm() {
    fireEvent.submit(screen.getByTestId("login-form"));
  }

  async function expectLoadingState(isLoading: boolean) {
    await waitFor(
      () => {
        const btn = screen.queryByRole("button", { name: /login|logging in/i });
        if (isLoading) {
          expect(btn).toBeInTheDocument();
          expect(btn).toBeDisabled();
          expect(btn).toHaveTextContent(/logging in/i);
          expect(btn?.querySelector("svg.animate-spin")).toBeInTheDocument();
        } else {
          expect(
            btn?.textContent?.includes("Login") ||
              !screen.queryByTestId("login-form"),
          ).toBe(true);
        }
      },
      { timeout: 5000 },
    );
  }

  async function expectErrorMessage(text: RegExp | string) {
    await waitFor(
      () => {
        const msg = screen.getByTestId("login-message");
        expect(msg).toBeInTheDocument();
        expect(msg).toHaveTextContent(text);
      },
      { timeout: 5000 },
    );
  }

  it("renders form fields, heading, button and links", async () => {
    renderLogin();
    await waitForFormReady();

    expect(
      screen.getByRole("heading", { name: /login to your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^login$/i }),
    ).toBeInTheDocument();
  });

  it("successful login updates auth store and redirects", async () => {
    renderLogin();
    await waitForFormReady();

    await fillLoginForm("testuser@example.com", "password123");
    await submitForm();

    await waitFor(
      () => {
        const { session, user, loading } = useAuthStore.getState();
        expect(session).not.toBeNull();
        expect(user?.email).toBe("testuser@example.com");
        expect(loading).toBe(false);
      },
      { timeout: 6000 },
    );

    await waitFor(
      () => expect(screen.queryByTestId("login-form")).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it("invalid credentials shows error message & keeps user logged out", async () => {
    // Use proper AuthError constructor
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthError(
        "Invalid login credentials",
        401,
        "invalid_credentials",
      ),
    });

    renderLogin();
    await waitForFormReady();

    // Valid input so submit fires
    await fillLoginForm("wrong@example.com", "veryweak123456");
    await submitForm();

    await expectErrorMessage(/invalid email or password|login failed/i);

    await waitFor(
      () => {
        const { session, user } = useAuthStore.getState();
        expect(session).toBeNull();
        expect(user).toBeNull();
      },
      { timeout: 4000 },
    );

    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });

  it("shows loading state during submission (failed case)", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 800));
      return {
        data: { user: null, session: null },
        error: new AuthError(
          "Invalid login credentials",
          401,
          "invalid_credentials",
        ),
      };
    });

    renderLogin();
    await waitForFormReady();

    await fillLoginForm("test@example.com", "veryweak123456");

    await submitForm();

    await expectLoadingState(true);

    await waitFor(() => expectLoadingState(false));

    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });

  it("shows client-side validation errors for invalid input", async () => {
    renderLogin();
    await waitForFormReady();

    await fillLoginForm("invalid", "short");

    await submitForm();

    await waitFor(
      () => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("submit button is disabled when form is invalid", async () => {
    renderLogin();
    await waitForFormReady();

    const button = screen.getByRole("button", { name: /^login$/i });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/email/i), "valid@example.com");
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/password/i), "veryweak123");
    expect(button).not.toBeDisabled();
  });
});
