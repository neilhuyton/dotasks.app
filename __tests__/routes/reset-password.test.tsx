import {
  describe,
  it,
  expect,
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
  resetPasswordRequestRateLimitedHandler,
} from "../../__mocks__/handlers/resetPasswordRequest";

import { renderWithProviders } from "../utils/test-helpers";

describe("Reset Password Page (/reset-password)", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  beforeEach(() => {
    server.use(resetPasswordRequestHandler);
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("renders the form and main elements", async () => {
    renderWithProviders( { initialEntries: ["/reset-password"] });

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
    renderWithProviders( { initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);
    const submitBtn = screen.getByRole("button", { name: /send reset link/i });

    expect(submitBtn).toBeDisabled();

    await userEvent.type(emailInput, "user@example.com");

    await waitFor(() => expect(submitBtn).toBeEnabled(), { timeout: 2000 });
  });

  it("shows validation error for invalid email", async () => {
    renderWithProviders( { initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);

    await userEvent.type(emailInput, "invalid-email");
    fireEvent.blur(emailInput);

    const error = await screen.findByText(/valid email/i);
    expect(error).toHaveClass("text-destructive");
  });

  it("submits valid email → resets form", async () => {
    renderWithProviders( { initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);
    await userEvent.type(emailInput, "user@example.com");

    const submitBtn = screen.getByRole("button", { name: /send reset link/i });
    await waitFor(() => expect(submitBtn).toBeEnabled(), { timeout: 2000 });

    const form = screen.getByTestId("reset-password-form");
    fireEvent.submit(form);

    await waitFor(() => expect(emailInput).toHaveValue(""), { timeout: 5000 });
  });

  it("shows loading state during submission", async () => {
    server.use(delayedResetPasswordRequestHandler);

    renderWithProviders( { initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);
    await userEvent.type(emailInput, "test@example.com");

    const submitBtn = screen.getByRole("button", { name: /send reset link/i });
    await waitFor(() => expect(submitBtn).toBeEnabled(), { timeout: 2000 });

    const form = screen.getByTestId("reset-password-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent(/sending…/i);
        expect(submitBtn.querySelector("svg.animate-spin")).toBeInTheDocument();
      },
      { timeout: 6000 },
    );
  });

  it('navigates to /login when "Back to login" is clicked', async () => {
    renderWithProviders( { initialEntries: ["/reset-password"] });

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
    server.use(resetPasswordRequestRateLimitedHandler);

    renderWithProviders( { initialEntries: ["/reset-password"] });

    const emailInput = await screen.findByLabelText(/^email$/i);
    await userEvent.type(emailInput, "spam@example.com");

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /send reset link/i }),
        ).toBeEnabled();
      },
      { timeout: 2000 },
    );

    const form = screen.getByTestId("reset-password-form");
    fireEvent.submit(form);

    // No reset expected on error, so just check button re-enables
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: /send reset link/i }),
        ).toBeEnabled(),
      { timeout: 5000 },
    );
  });
});
