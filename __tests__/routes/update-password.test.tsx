// __tests__/routes/update-password.test.tsx

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";
import { supabase } from "@/lib/supabase";
import { AuthError, type Session, type User } from "@supabase/supabase-js";
import { suppressActWarnings } from "../../__tests__/act-suppress";

suppressActWarnings();

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        updateUser: vi.fn(),
        signOut: vi.fn(),
      },
    },
  };
});

const mockUser: User = {
  id: "test-user-123",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2025-01-01T00:00:00.000Z",
  role: "authenticated",
  email_confirmed_at: "2025-01-01T00:00:00.000Z",
  phone_confirmed_at: undefined,
  last_sign_in_at: "2025-01-01T00:00:00.000Z",
  confirmed_at: "2025-01-01T00:00:00.000Z",
  recovery_sent_at: undefined,
  email_change_sent_at: undefined,
  new_email: undefined,
  new_phone: undefined,
  invited_at: undefined,
  action_link: undefined,
  email: "test@example.com",
  phone: undefined,
  confirmation_sent_at: undefined,
  factors: undefined,
  identities: [],
  updated_at: "2025-01-01T00:00:00.000Z",
};

const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
};

const mockSubscription = () => ({
  id: Symbol("mock-subscription"),
  callback: vi.fn(),
  unsubscribe: vi.fn(),
});

describe("Update Password Page (/update-password)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      (callback) => {
        supabase.auth.getSession().then((res) => {
          const session = res.data.session ?? null;
          queueMicrotask(() => callback("INITIAL_SESSION", session));
        });
        return { data: { subscription: mockSubscription() } };
      },
    );

    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
  });

  function renderUpdatePasswordPage(hash = "") {
    const initialEntries = hash
      ? [`/update-password#${hash}`]
      : ["/update-password"];
    return renderWithProviders({ initialEntries });
  }

  it("renders error message when no valid session is found", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    renderUpdatePasswordPage();
    await waitFor(
      () => {
        expect(
          screen.getByText(
            /Invalid or expired reset link\. Please request a new one\./i,
          ),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    expect(screen.queryByLabelText(/New Password/i)).not.toBeInTheDocument();
  });

  it("shows generic error message even with error_description in hash", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    renderUpdatePasswordPage("error_description=Token%20has%20expired");
    await waitFor(
      () => {
        expect(
          screen.getByText(
            "Invalid or expired reset link. Please request a new one.",
          ),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows form when valid session is present", async () => {
    renderUpdatePasswordPage();
    await waitFor(
      () => {
        expect(screen.getByText("Set New Password")).toBeInTheDocument();
        expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });

  it("disables submit until passwords match and are long enough", async () => {
    const user = userEvent.setup();
    renderUpdatePasswordPage();
    await screen.findByLabelText(/New Password/i, {}, { timeout: 2000 });
    const submit = screen.getByRole("button", { name: /Update Password/i });
    const pwd = screen.getByLabelText(/New Password/i);
    const confirm = screen.getByLabelText(/Confirm Password/i);
    expect(submit).toBeDisabled();
    await user.type(pwd, "short");
    expect(submit).toBeDisabled();
    await user.clear(pwd);
    await user.type(pwd, "longenough123456");
    expect(submit).toBeDisabled();
    await user.type(confirm, "wrong");
    expect(submit).toBeDisabled();
    await user.clear(confirm);
    await user.type(confirm, "longenough123456");
    await waitFor(() => expect(submit).not.toBeDisabled(), { timeout: 1500 });
  });

  it("shows validation messages for short password and mismatch", async () => {
    const user = userEvent.setup();
    renderUpdatePasswordPage();
    const pwd = await screen.findByLabelText(/New Password/i);
    const confirm = screen.getByLabelText(/Confirm Password/i);
    await user.type(pwd, "abc123");
    await user.tab();
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    await user.type(confirm, "different");
    await user.tab();
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
  });

  it("shows loading, success message and redirects on successful update", async () => {
    const user = userEvent.setup();
    const { router } = renderUpdatePasswordPage();
    await screen.findByLabelText(/New Password/i, {}, { timeout: 2000 });

    await user.type(screen.getByLabelText(/New Password/i), "securepass123456");
    await user.type(
      screen.getByLabelText(/Confirm Password/i),
      "securepass123456",
    );

    vi.mocked(supabase.auth.updateUser).mockImplementationOnce(async () => {
      return { data: { user: mockUser }, error: null };
    });

    vi.mocked(supabase.auth.signOut).mockImplementationOnce(async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementationOnce(
        (cb) => {
          queueMicrotask(() => cb("SIGNED_OUT", null));
          return { data: { subscription: mockSubscription() } };
        },
      );
      return { error: null };
    });

    await user.click(screen.getByRole("button", { name: /Update Password/i }));

    await waitFor(
      () => {
        expect(
          screen.getByText(
            /Password updated successfully! Redirecting to login.../i,
          ),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    await new Promise((resolve) => setTimeout(resolve, 4000));

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe("/login");
      },
      { timeout: 2000 },
    );
  });

  it("shows error message when update fails", async () => {
    const user = userEvent.setup();
    renderUpdatePasswordPage();
    await screen.findByLabelText(/New Password/i, {}, { timeout: 2000 });

    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: null },
      error: new AuthError("Password is too common", 400),
    });

    await user.type(screen.getByLabelText(/New Password/i), "password123");
    await user.type(screen.getByLabelText(/Confirm Password/i), "password123");
    await user.click(screen.getByRole("button", { name: /Update Password/i }));

    await waitFor(
      () => {
        expect(
          screen.getByText(/Error: Password is too common/i),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
