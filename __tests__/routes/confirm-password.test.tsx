// __tests__/routes/confirm-reset-password.test.tsx

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
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import {
  resetPasswordConfirmHandler,
  delayedResetPasswordConfirmHandler,
  resetPasswordConfirmInvalidTokenHandler,
} from "../../__mocks__/handlers/resetPasswordConfirm";

import { router } from "@/router";

import {
  renderWithTrpcRouter,
  expectSuccessMessage,
  expectErrorMessage,
} from "../utils/test-helpers";
import { suppressActWarnings } from "../act-suppress";

suppressActWarnings();

const user = userEvent.setup();

describe("Confirm Reset Password (/confirm-reset-password)", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    server.resetHandlers();
    server.use(resetPasswordConfirmHandler);
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  function renderConfirmResetPage(token?: string) {
    const search = token ? `?token=${token}` : "";
    const result = renderWithTrpcRouter({
      initialPath: `/confirm-reset-password${search}`,
      routeTree: router.routeTree,
    });

    const navigateSpy = vi.spyOn(result.router, "navigate");

    return { ...result, navigateSpy };
  }

  const waitForFormToAppear = async () =>
    waitFor(() => screen.getByTestId("confirm-reset-password-form"), {
      timeout: 2000,
    });

  const waitForInvalidTokenMessage = async () =>
    waitFor(() => screen.getByText("Invalid or missing token"), {
      timeout: 1500,
    });

  const fillPasswordAndSubmit = async (password: string) => {
    const passwordInput = screen.getByTestId("password-input");
    await user.type(passwordInput, password);

    const form = screen.getByTestId("confirm-reset-password-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  };

  const expectLoadingState = async () => {
    await waitFor(
      () => {
        const input = screen.getByTestId("password-input");
        const button = screen.getByTestId("reset-password-button");

        expect(input).toBeDisabled();
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent("Resetting...");
        expect(
          screen.getByTestId("confirm-reset-password-loading"),
        ).toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  };

  it("shows invalid token message when no token is provided", async () => {
    renderConfirmResetPage();
    await waitForInvalidTokenMessage();
    expect(
      screen.getByText(/Please request a new password reset link/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Reset Password" }),
    ).toBeInTheDocument();
  });

  it("shows invalid token message when token is empty string", async () => {
    renderConfirmResetPage("");
    await waitForInvalidTokenMessage();
  });

  it("renders password form when valid token is provided", async () => {
    renderConfirmResetPage("valid-token-123");
    await waitForFormToAppear();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("reset-password-button")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /reset your password/i,
    );
  });

  it("successful submission → shows success message and navigates to login", async () => {
    const { navigateSpy } = renderConfirmResetPage("good-token");

    navigateSpy.mockImplementation(async () => {
      /* do nothing */
    });

    await waitForFormToAppear();
    await fillPasswordAndSubmit("VeryStrongPass456!");

    await expectSuccessMessage(
      "confirm-reset-password-message",
      /successfully/i,
      "text-green-500",
      4000,
    );

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/login" }),
    );

    navigateSpy.mockRestore();
  });

  it("invalid/expired token → shows error message, form remains", async () => {
    server.use(resetPasswordConfirmInvalidTokenHandler);
    renderConfirmResetPage("expired-token");
    await waitForFormToAppear();
    await fillPasswordAndSubmit("VeryStrongPass456!");
    await expectErrorMessage(
      "confirm-reset-password-message",
      /invalid|expired/i,
      "text-red-500",
      4000,
    );
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
  });

  it("disables inputs/button and shows loading during submission", async () => {
    server.use(delayedResetPasswordConfirmHandler);
    renderConfirmResetPage("slow-token");
    await waitForFormToAppear();
    await fillPasswordAndSubmit("VeryStrongPass456!");
    await expectLoadingState();
  });

  it('navigates to login when clicking "Back to login" link', async () => {
    const { navigateSpy } = renderConfirmResetPage("valid-token");
    await waitForFormToAppear();
    await user.click(screen.getByTestId("back-to-login-link"));
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/login" }),
    );
  });
});
