// __tests__/routes/verify-email.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";

import { server } from "../../__mocks__/server";
import { verifyEmailHandler } from "../../__mocks__/handlers/verifyEmail";
import { TEST_VERIFICATION_TOKENS } from "../test-constants";
import { renderWithProviders } from "../utils/test-helpers";

const mockedNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

function renderVerifyEmail(token: string) {
  const url = `/verify-email?token=${encodeURIComponent(token)}`;
  return renderWithProviders({ initialEntries: [url] });
}

describe("VerifyEmailPage", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterAll(() => server.close());

  beforeEach(() => {
    server.resetHandlers();
    server.use(verifyEmailHandler);
    mockedNavigate.mockClear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("shows loading then success and redirects after delay for valid token", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS);

    await waitFor(
      () =>
        expect(screen.getByTestId("verify-message")).toHaveTextContent(
          "Verifying your email...",
        ),
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const msg = screen.getByTestId("verify-message");
        expect(msg).toHaveTextContent(/verified successfully|Email verified/i);
        expect(msg).toHaveClass("text-green-600");
      },
      { timeout: 8000 },
    );

    expect(
      screen.getByText(/Redirecting to login in 5 seconds.../i),
    ).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 5500));

    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith({ to: "/login" });
  }, 15000);

  it("shows error for invalid token and does NOT redirect", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.INVALID);

    await waitFor(
      () => {
        const msg = screen.getByTestId("verify-message");
        expect(msg).toHaveTextContent(/invalid|expired|failed/i);
        expect(msg).toHaveClass("text-red-600");
      },
      { timeout: 4000 },
    );

    expect(mockedNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText(/Redirecting/i)).not.toBeInTheDocument();
  });

  it("shows error for already verified email and does NOT redirect", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.ALREADY_VERIFIED);

    await waitFor(
      () => {
        const msg = screen.getByTestId("verify-message");
        expect(msg).toHaveTextContent(/already verified/i);
        expect(msg).toHaveClass("text-red-600");
      },
      { timeout: 4000 },
    );

    expect(mockedNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText(/Redirecting/i)).not.toBeInTheDocument();
  });

  it("displays the page title", async () => {
    renderVerifyEmail(TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS);

    await waitFor(
      () =>
        expect(
          screen.getByRole("heading", { name: /Email Verification/i }),
        ).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });
});
