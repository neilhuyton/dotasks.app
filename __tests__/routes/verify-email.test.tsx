// __tests__/routes/verify-email.test.tsx

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
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import { verifyEmailHandler } from "../../__mocks__/handlers/verifyEmail";
import { mockUsers } from "../../__mocks__/mockUsers";
import { TEST_VERIFICATION_TOKENS } from "../test-constants";
import { useAuthStore } from "../../src/store/authStore";
import { router } from "../../src/router";

import {
  renderWithTrpcRouter,
  expectSuccessMessage,
  expectErrorMessage,
} from "../utils/test-helpers";

function renderVerifyEmail(token: string) {
  renderWithTrpcRouter({
    initialPath: `/verify-email?token=${token}`,
    routeTree: router.routeTree,
  });
}

describe("VerifyEmailPage", () => {
  const initialMockUsers = structuredClone(mockUsers);

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    server.use(verifyEmailHandler);
    vi.clearAllMocks();

    mockUsers.length = 0;
    mockUsers.push(...structuredClone(initialMockUsers));

    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("shows loading then success for valid delayed token", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS);

    await waitFor(
      () =>
        expect(screen.getByTestId("verify-email-loading")).toBeInTheDocument(),
      { timeout: 1200 },
    );

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("verify-email-loading"),
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("verify-message")).toBeInTheDocument();
      },
      { timeout: 3500 },
    );

    await expectSuccessMessage(
      "verify-message",
      "Email verified successfully!",
      "text-green-800",
      4000,
    );
  });

  it("shows error for invalid token", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.INVALID);

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("verify-email-loading"),
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("verify-message")).toBeInTheDocument();
      },
      { timeout: 3500 },
    );

    await expectErrorMessage(
      "verify-message",
      "Invalid or expired verification token",
      "text-red-800",
    );
  });

  it("shows error for already verified email", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.ALREADY_VERIFIED);

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("verify-email-loading"),
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("verify-message")).toBeInTheDocument();
      },
      { timeout: 3500 },
    );

    await expectErrorMessage(
      "verify-message",
      "Email already verified",
      "text-red-800",
    );
  });

  it("displays the page title", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS);

    await waitFor(
      () => expect(screen.getByText("Email Verification")).toBeInTheDocument(),
      { timeout: 1500 },
    );
  });
});
