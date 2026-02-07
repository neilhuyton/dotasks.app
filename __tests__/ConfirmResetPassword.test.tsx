// __tests__/ConfirmResetPassword.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "../src/trpc";
import "@testing-library/jest-dom";
import { server } from "../__mocks__/server";
import { resetPasswordConfirmHandler } from "../__mocks__/handlers/resetPasswordConfirm";
import ConfirmResetPasswordForm from "../src/components/ConfirmResetPasswordForm";

// Mock router to prevent navigation errors
vi.mock("../src/router/router", () => ({
  router: {
    navigate: vi.fn(),
  },
}));

describe("ConfirmResetPasswordForm", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "/trpc",
        fetch: (input, init) => fetch(input, init),
      }),
    ],
  });

  const renderForm = (token = "123e4567-e89b-12d3-a456-426614174000") => {
    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ConfirmResetPasswordForm token={token} />
        </QueryClientProvider>
      </trpc.Provider>,
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
    server.use(resetPasswordConfirmHandler);

    // Suppress expected rejection messages
    process.on("unhandledRejection", (reason) => {
      if (reason instanceof Error) {
        if (
          reason.message.includes("Token and new password are required") ||
          reason.message.includes("Invalid or expired token")
        ) {
          return;
        }
      }
      throw reason;
    });
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
    process.removeAllListeners("unhandledRejection");
  });

  it("submits valid token and new password and displays success message", async () => {
    renderForm();

    // Wait for form to appear
    await waitFor(() => {
      expect(
        screen.getByTestId("confirm-reset-password-form"),
      ).toBeInTheDocument();
    });

    // Type password
    const passwordInput = screen.getByTestId("password-input");
    await userEvent.type(passwordInput, "newSecurePassword123");

    // Submit form using original method
    const form = screen.getByTestId("confirm-reset-password-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    // Wait for success message
    await waitFor(
      () => {
        const message = screen.getByTestId("confirm-reset-password-message");
        expect(message).toBeInTheDocument();
        expect(message).toHaveTextContent("Password reset successfully");
        expect(message).toHaveClass("text-green-500");
      },
      { timeout: 2000 },
    );
  });
});
