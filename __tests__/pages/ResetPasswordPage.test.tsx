// __tests__/pages/ResetPasswordPage.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "../../src/trpc";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import ResetPasswordForm from "../../src/pages/ResetPasswordPage";
import { resetPasswordRequestHandler } from "../../__mocks__/handlers/resetPasswordRequest";

vi.mock("../src/router/router", () => ({
  router: {
    navigate: vi.fn(),
  },
}));

describe("ResetPasswordForm", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [
      httpLink({
        url: "/trpc",
      }),
    ],
  });

  const renderComponent = async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordForm />
        </QueryClientProvider>
      </trpc.Provider>,
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    server.use(resetPasswordRequestHandler);
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders email input, submit button and back-to-login link", async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("submit-button")).toBeInTheDocument();
      expect(screen.getByTestId("back-to-login-link")).toBeInTheDocument();
    });
  });

  it("submits valid email → shows neutral success message and clears input", async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
    });

    const emailInput = screen.getByTestId("email-input");
    await userEvent.type(emailInput, "unknown@example.com");

    const formElement = screen.getByTestId("reset-password-form");

    await waitFor(() => {
      expect(formElement).toBeInTheDocument();
    });

    await act(async () => {
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      formElement.dispatchEvent(submitEvent);
    });

    await waitFor(
      () => {
        const messageEl = screen.getByTestId("reset-password-message");
        expect(messageEl).toBeInTheDocument();
        expect(messageEl).toHaveTextContent(
          "If the email exists, a reset link has been sent.",
        );
        expect(messageEl).toHaveClass("text-green-500");
        expect(emailInput).toHaveValue("");
      },
      { timeout: 5000 },
    );
  });

  it.todo("shows client-side validation error for invalid email");
  it.todo("shows error message on server failure");
  it.todo("disables button and shows loading state during submission");
});
