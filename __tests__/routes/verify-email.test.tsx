// __tests__/routes/verify-email.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import { verifyEmailHandler } from "../../__mocks__/handlers/verifyEmail";
import { TEST_VERIFICATION_TOKENS } from "../test-constants";
import { renderWithProviders } from "../utils/test-helpers";

function renderVerifyEmail(token: string) {
  const url = `/verify-email?token=${encodeURIComponent(token)}`;
  return renderWithProviders({ initialEntries: [url] });
}

describe("VerifyEmailPage", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterAll(() => server.close());

  beforeEach(() => {
    server.use(verifyEmailHandler);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("shows loading then success for valid token", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS);

    await waitFor(
      () =>
        expect(screen.getByTestId("verify-message")).toHaveTextContent(
          "Verifying your email...",
        ),
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        const msg = screen.getByTestId("verify-message");
        expect(msg).toHaveTextContent(/verified successfully|Email verified/i);
        expect(msg).toHaveClass("text-green-600");
      },
      { timeout: 3000 },
    );

    expect(screen.getByText(/Redirecting to login.../i)).toBeInTheDocument();
  });

  it("shows error for invalid token", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.INVALID);

    await waitFor(
      () => {
        const msg = screen.getByTestId("verify-message");
        expect(msg).toHaveTextContent(/invalid|expired|failed/i);
        expect(msg).toHaveClass("text-red-600");
      },
      { timeout: 2000 },
    );

    expect(screen.queryByText(/Redirecting/i)).not.toBeInTheDocument();
  });

  it("shows error for already verified email", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.ALREADY_VERIFIED);

    await waitFor(
      () => {
        const msg = screen.getByTestId("verify-message");
        expect(msg).toHaveTextContent(/already verified/i);
        expect(msg).toHaveClass("text-red-600");
      },
      { timeout: 2000 },
    );

    expect(screen.queryByText(/Redirecting/i)).not.toBeInTheDocument();
  });

  it("displays the page title", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS);

    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: /Email Verification/i }),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });
});
