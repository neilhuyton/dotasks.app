// __tests__/routes/reset-password.test.tsx

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
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";

import { server } from "../../__mocks__/server";
import {
  resetPasswordRequestHandler,
  delayedResetPasswordRequestHandler,
} from "../../__mocks__/handlers/resetPasswordRequest";

import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/shared/store/authStore";
import { AuthError } from "@supabase/supabase-js";

describe("Reset Password Page (/reset-password)", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterAll(() => server.close());

  beforeEach(() => {
    server.resetHandlers();
    server.use(resetPasswordRequestHandler);
    vi.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  it("renders the form and main elements", async () => {
    renderWithProviders({ initialEntries: ["/reset-password"] });

    await screen.findByRole("heading", {
      name: /reset your password/i,
      level: 1,
    });

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /back to login/i }),
    ).toBeInTheDocument();
  });

  it("enables submit button after typing valid email", async () => {
    renderWithProviders({ initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);
    const submitBtn = screen.getByRole("button", { name: /send reset link/i });

    expect(submitBtn).toBeDisabled();

    await userEvent.type(emailInput, "user@example.com");

    await waitFor(() => expect(submitBtn).toBeEnabled(), { timeout: 2000 });
  });

  it("shows validation error for invalid email", async () => {
    renderWithProviders({ initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);

    await userEvent.type(emailInput, "invalid-email");
    fireEvent.blur(emailInput);

    const error = await screen.findByText(/valid email/i);
    expect(error).toHaveClass("text-destructive");
  });

  it("submits valid email → shows success message and resets form", async () => {
    renderWithProviders({ initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);
    await userEvent.type(emailInput, "user@example.com");

    const submitBtn = screen.getByRole("button", { name: /send reset link/i });
    await waitFor(() => expect(submitBtn).toBeEnabled(), { timeout: 2000 });

    await userEvent.click(submitBtn);

    await waitFor(
      () => {
        expect(emailInput).toHaveValue("");
        expect(
          screen.getByText(/password reset link sent/i),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows loading state during submission", async () => {
    server.use(delayedResetPasswordRequestHandler);

    renderWithProviders({ initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);
    await userEvent.type(emailInput, "test@example.com");

    const submitBtn = screen.getByRole("button", { name: /send reset link/i });
    await waitFor(() => expect(submitBtn).toBeEnabled(), { timeout: 2000 });

    await userEvent.click(submitBtn);

    await waitFor(
      () => {
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent(/sending…/i);
        expect(submitBtn.querySelector("svg.animate-spin")).toBeInTheDocument();
      },
      { timeout: 6000 },
    );

    await waitFor(
      () => expect(submitBtn).toHaveTextContent(/send reset link/i),
      { timeout: 8000 },
    );
  });

  it('navigates to /login when "Back to login" is clicked', async () => {
    renderWithProviders({ initialEntries: ["/reset-password"] });

    const backBtn = await screen.findByRole("button", {
      name: /back to login/i,
    });
    await userEvent.click(backBtn);

    await screen.findByRole("heading", {
      name: /login to your account/i,
      level: 1,
    });
  });

  it("handles rate limit error without crashing", async () => {
    vi.spyOn(
      useAuthStore.getState().supabase.auth,
      "resetPasswordForEmail",
    ).mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 300));
      return {
        data: null,
        error: new AuthError("Rate limit exceeded", 429),
      };
    });

    renderWithProviders({ initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);
    await userEvent.type(emailInput, "spam@example.com");

    const submitBtn = screen.getByRole("button", { name: /send reset link/i });
    await waitFor(() => expect(submitBtn).toBeEnabled(), { timeout: 2000 });

    await userEvent.click(submitBtn);

    await waitFor(
      () => {
        expect(submitBtn).toBeEnabled();
        expect(screen.getByText(/error/i)).toBeInTheDocument(); // adjust if your message is more specific
        expect(screen.queryByText(/sending…/i)).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
