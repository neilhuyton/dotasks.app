// __tests__/routes/reset-password.test.tsx

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";
import { supabase } from "@/lib/supabase";
import { AuthError } from "@supabase/supabase-js";

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        resetPasswordForEmail: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
    },
  };
});

describe("Reset Password Page (/reset-password)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
  });

  function renderResetPasswordPage() {
    return renderWithProviders({ initialEntries: ["/reset-password"] });
  }

  it("renders the form and heading", async () => {
    renderResetPasswordPage();

    await screen.findByText("Reset your password");

    expect(
      screen.getByText(/Enter your email to receive a password reset link/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Send Reset Link/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Back to login/i }),
    ).toBeInTheDocument();
  });

  it("disables submit button until valid email is entered", async () => {
    const user = userEvent.setup();
    renderResetPasswordPage();

    const emailInput = await screen.findByLabelText("Email");
    const submit = screen.getByRole("button", { name: /Send Reset Link/i });

    expect(submit).toBeDisabled();

    await user.type(emailInput, "invalid");
    expect(submit).toBeDisabled();

    await user.clear(emailInput);
    await user.type(emailInput, "valid@email.com");

    await waitFor(() => expect(submit).not.toBeDisabled());
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderResetPasswordPage();

    const emailInput = await screen.findByLabelText("Email");

    await user.type(emailInput, "not-an-email");
    await user.tab();

    await screen.findByText(/Please enter a valid email/i);
  });

  it("submits form and shows success message on success", async () => {
    const user = userEvent.setup();
    renderResetPasswordPage();

    const emailInput = await screen.findByLabelText("Email");
    const submit = screen.getByRole("button", { name: /Send Reset Link/i });

    await user.type(emailInput, "test@example.com");
    await user.click(submit);

    await screen.findByText(/Password reset link sent!/i);
    await screen.findByText(/Check your email \(including spam\/junk\)\./i);
  });

  it("shows error message when reset fails", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: null,
      error: new AuthError("Email not found", 404),
    });

    const user = userEvent.setup();
    renderResetPasswordPage();

    const emailInput = await screen.findByLabelText("Email");
    const submit = screen.getByRole("button", { name: /Send Reset Link/i });

    await user.type(emailInput, "unknown@example.com");
    await user.click(submit);

    await screen.findByText(/Error: Email not found/i);
  });

  it("shows loading state during submission", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockImplementationOnce(
      async () => {
        await new Promise((r) => setTimeout(r, 100));
        return { data: {}, error: null };
      },
    );

    const user = userEvent.setup();
    renderResetPasswordPage();

    const emailInput = await screen.findByLabelText("Email");
    const submit = screen.getByRole("button", { name: /Send Reset Link/i });

    await user.type(emailInput, "test@example.com");
    await user.click(submit);

    await waitFor(() => {
      expect(submit).toHaveTextContent("Sending…");
      expect(submit).toBeDisabled();
    });
  });

  it('navigates back to login when "Back to login" is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderResetPasswordPage();

    const backButton = await screen.findByRole("button", {
      name: /Back to login/i,
    });

    await user.click(backButton);

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe("/login");
      },
      { timeout: 2000 },
    );
  });
});
