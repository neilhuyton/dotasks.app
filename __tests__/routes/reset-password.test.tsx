import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";
import { supabase } from "@/lib/supabase";
import { AuthError } from "@supabase/auth-js";

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        resetPasswordForEmail: vi.fn(),
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
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
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    });
  });

  it("calls supabase resetPasswordForEmail with email and redirectTo", async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders({
      initialEntries: ["/reset-password"],
    });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/reset-password"),
    );

    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.click(
      await screen.findByRole("button", { name: /Send Reset Link/i }),
    );

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "user@example.com",
      {
        redirectTo: expect.stringContaining("/update-password"),
      },
    );
  });

  it("passes isLoading=true to form during reset request", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: {}, error: null }), 150),
        ),
    );

    const user = userEvent.setup();
    renderWithProviders({ initialEntries: ["/reset-password"] });

    await user.type(await screen.findByLabelText("Email"), "test@example.com");
    await user.click(
      await screen.findByRole("button", { name: /Send Reset Link/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Sending…/i }),
      ).toBeInTheDocument(),
    );
  });

  it("shows error message when reset fails", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: null,
      error: new AuthError("Email not found", 404, "email_not_found"),
    });

    const user = userEvent.setup();
    renderWithProviders({ initialEntries: ["/reset-password"] });

    await user.type(
      await screen.findByLabelText("Email"),
      "unknown@example.com",
    );
    await user.click(
      await screen.findByRole("button", { name: /Send Reset Link/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Error: Email not found/i)).toBeInTheDocument(),
    );
  });
  it("navigates to /login when clicking 'Back to login'", async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders({
      initialEntries: ["/reset-password"],
    });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/reset-password"),
    );

    await user.click(
      await screen.findByRole("button", { name: /Back to login/i }),
    );

    expect(router.state.location.pathname).toBe("/login");
  });
});
