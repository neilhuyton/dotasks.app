// __tests__/routes/reset-password.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import {
  resetPasswordRequestHandler,
  delayedResetPasswordRequestHandler,
  resetPasswordRequestServerErrorHandler,
} from "../../__mocks__/handlers/resetPasswordRequest";

import { router } from "@/router/router";

import {
  renderWithTrpcRouter,
  expectSuccessMessage,
  expectErrorMessage,
} from "../utils/test-helpers";
import { suppressActWarnings } from "../act-suppress";

suppressActWarnings();

function renderResetPassword() {
  const { history } = renderWithTrpcRouter({
    initialPath: "/reset-password",
    routeTree: router.routeTree,
  });

  return { history };
}

const waitForFormToBeReady = async () =>
  waitFor(() => screen.getByTestId("email-input"), { timeout: 2000 });

const fillEmailAndSubmit = async (email: string) => {
  const emailInput = screen.getByTestId("email-input");
  await userEvent.clear(emailInput);
  await userEvent.type(emailInput, email);

  const form = screen.getByTestId("reset-password-form");
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
};

describe("Reset Password Route (/reset-password)", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    server.use(resetPasswordRequestHandler);
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders form fields, submit button and back link", async () => {
    renderResetPassword();
    await waitForFormToBeReady();

    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
    expect(screen.getByTestId("back-to-login-link")).toBeInTheDocument();
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
  });

  it("submits valid email → shows success message and clears input", async () => {
    renderResetPassword();
    await waitForFormToBeReady();

    await fillEmailAndSubmit("user@example.com");

    await expectSuccessMessage(
      "reset-password-message",
      /reset link has been sent/i,
      "text-green-500",
      5000,
    );

    expect(screen.getByTestId("email-input")).toHaveValue("");
  });

  it("shows client-side validation error for invalid email", async () => {
    renderResetPassword();
    await waitForFormToBeReady();

    await fillEmailAndSubmit("invalid-email");

    await waitFor(
      () => {
        const error = screen.getByText(/valid email/i);
        expect(error).toBeInTheDocument();
        expect(error).toHaveClass("text-destructive");
        expect(
          screen.queryByTestId("reset-password-message"),
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("disables button and shows loading spinner during submission", async () => {
    server.use(delayedResetPasswordRequestHandler);

    renderResetPassword();
    await waitForFormToBeReady();

    const submitBtn = screen.getByTestId("submit-button");
    expect(submitBtn).not.toBeDisabled();

    await fillEmailAndSubmit("test@example.com");

    await waitFor(
      () => {
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent("Sending...");
        expect(
          screen.getByTestId("reset-password-loading"),
        ).toBeInTheDocument();
      },
      { timeout: 2500 },
    );

    await waitFor(() => expect(submitBtn).not.toBeDisabled(), {
      timeout: 4000,
    });
  });

  it("shows error message when server returns failure", async () => {
    server.use(resetPasswordRequestServerErrorHandler);

    renderResetPassword();
    await waitForFormToBeReady();

    await fillEmailAndSubmit("user@example.com");

    await expectErrorMessage(
      "reset-password-message",
      /failed|error|try again/i,
      "text-red-500",
      5000,
    );
  });

  it("navigates to login when clicking 'Back to login' link", async () => {
    const { history } = renderResetPassword();

    await waitFor(() => screen.getByTestId("back-to-login-link"), {
      timeout: 1500,
    });

    await userEvent.click(screen.getByTestId("back-to-login-link"));

    await waitFor(
      () => {
        expect(history.location.pathname).toBe("/login");
      },
      { timeout: 2000 },
    );
  });

  // it.todo("prevents double submission while request is pending");
  // it.todo("handles rate-limit error gracefully");
});
