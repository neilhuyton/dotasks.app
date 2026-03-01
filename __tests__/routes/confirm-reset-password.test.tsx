// __tests__/routes/confirm-rest-password.test.tsx

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
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../__mocks__/server";
import {
  resetPasswordConfirmHandler,
  delayedResetPasswordConfirmHandler,
  resetPasswordConfirmInvalidTokenHandler,
} from "../../__mocks__/handlers/resetPasswordConfirm";

import { renderWithProviders } from "../utils/test-helpers";
import { suppressActWarnings } from "../act-suppress";

suppressActWarnings();

describe("Confirm Reset Password Page", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

  beforeEach(() => {
    server.resetHandlers();
    server.use(resetPasswordConfirmHandler);
  });

  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  function renderConfirmReset(token?: string) {
    const search = token ? `?token=${token}` : "";
    return renderWithProviders({
      initialEntries: [`/confirm-reset-password${search}`],
    });
  }

  async function waitForInvalidTokenView() {
    await waitFor(
      () => {
        expect(
          screen.getByText(/invalid or missing token/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/please request a new password reset link/i),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  }

  async function waitForFormReady() {
    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: /reset your password/i }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
        expect(
          screen.getByLabelText(/confirm new password/i),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  }

  async function fillAndSubmitNewPassword(password: string) {
    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    await userEvent.clear(newPasswordInput);
    await userEvent.type(newPasswordInput, password);

    await userEvent.clear(confirmPasswordInput);
    await userEvent.type(confirmPasswordInput, password);

    const form = screen.getByTestId("confirm-reset-password-form");
    fireEvent.submit(form);

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  async function expectLoadingState(isLoading: boolean) {
    await waitFor(
      () => {
        const button = screen.getByRole("button", {
          name: isLoading ? /resetting/i : /^reset password$/i,
        });

        if (isLoading) {
          expect(button).toBeDisabled();
          expect(button.querySelector("svg.animate-spin")).toBeInTheDocument();
        } else {
          expect(button).not.toBeDisabled();
          expect(
            button.querySelector("svg.animate-spin"),
          ).not.toBeInTheDocument();
        }
      },
      { timeout: 6000 },
    );
  }

  async function expectSuccessMessage() {
    await waitFor(
      () => {
        expect(
          screen.getByText(
            /Password reset successfully! Redirecting to login.../i,
          ),
        ).toBeInTheDocument();
        expect(screen.getByText(/successfully/i)).toHaveClass(/text-green-500/);
      },
      { timeout: 2000 },
    );
  }

  async function expectErrorMessage() {
    await waitFor(
      () => {
        expect(screen.getByText(/invalid|expired/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid|expired/i)).toHaveClass(
          /text-red-500/,
        );
      },
      { timeout: 5000 },
    );
  }

  it("shows invalid token message when no token is provided", async () => {
    renderConfirmReset();
    await waitForInvalidTokenView();

    expect(
      screen.getByRole("link", { name: /reset password/i }),
    ).toBeInTheDocument();
  });

  it("shows invalid token message when token is empty", async () => {
    renderConfirmReset("");
    await waitForInvalidTokenView();
  });

  it("renders password reset form when valid token is provided", async () => {
    renderConfirmReset("valid-token-123");
    await waitForFormReady();

    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^reset password$/i }),
    ).toBeInTheDocument();
  });

  it("successful password reset → shows success and navigates to login", async () => {
    const { router } = renderConfirmReset("good-token");
    await waitForFormReady();

    const navigateSpy = vi.spyOn(router, "navigate");

    await fillAndSubmitNewPassword("VeryStrongPass456!");

    await expectSuccessMessage();

    await new Promise((r) => setTimeout(r, 3500));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/login" }),
    );

    expect(
      screen.getByRole("heading", { name: /login to your account/i }),
    ).toBeInTheDocument();

    navigateSpy.mockRestore();
  });

  it("invalid/expired token → shows error message and keeps form visible", async () => {
    server.use(resetPasswordConfirmInvalidTokenHandler);

    renderConfirmReset("expired-token");
    await waitForFormReady();

    await fillAndSubmitNewPassword("VeryStrongPass456!");

    await expectErrorMessage();

    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
  });

  it("shows loading state during submission", async () => {
    server.use(delayedResetPasswordConfirmHandler);

    renderConfirmReset("slow-token");
    await waitForFormReady();

    const submissionPromise = fillAndSubmitNewPassword("VeryStrongPass456!");

    await expectLoadingState(true);

    await submissionPromise;

    await expectLoadingState(false);
  });

  it("navigates to login when clicking 'Back to login' button", async () => {
    const { router } = renderConfirmReset("valid-token");
    await waitForFormReady();

    const navigateSpy = vi.spyOn(router, "navigate");

    const backButton = screen.getByRole("button", { name: /back to login/i });
    await userEvent.click(backButton);

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/login" }),
    );

    navigateSpy.mockRestore();
  });
});
