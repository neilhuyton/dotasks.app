// __tests__/ResetPasswordForm.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "../src/trpc";
import { server } from "../__mocks__/server";
import "@testing-library/jest-dom";
import { act } from "react"; // ← ADD THIS LINE

import ResetPasswordForm from "../src/components/ResetPasswordForm";
import { resetPasswordRequestHandler } from "../__mocks__/handlers/resetPasswordRequest";

// Mock router to avoid navigate errors
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
      httpBatchLink({
        url: "/trpc",
        fetch: (input, init) => fetch(input, init),
      }),
    ],
  });

  const renderComponent = async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mock("../src/store/authStore", () => ({
      useAuthStore: Object.assign(
        vi.fn().mockReturnValue({ isLoggedIn: false, userId: null }),
        {
          getState: vi
            .fn()
            .mockReturnValue({ isLoggedIn: false, userId: null }),
        },
      ),
    }));

    await render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordForm />
        </QueryClientProvider>
      </trpc.Provider>,
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
    server.use(resetPasswordRequestHandler);

    process.on("unhandledRejection", (reason) => {
      if (reason instanceof Error && reason.message.includes("Invalid email")) {
        return;
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

    await userEvent.type(
      screen.getByTestId("email-input"),
      "unknown@example.com",
    );

    const form = screen.getByRole("form");

    await act(async () => {
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      form.dispatchEvent(submitEvent);
    });

    await waitFor(
      () => {
        // Use text lookup instead of role="alert" — your DOM doesn't have role="alert"
        const message = screen.getByText(
          "If the email exists, a reset link has been sent.",
        );
        expect(message).toBeInTheDocument();
        expect(message).toHaveClass("text-green-500"); // adjust class if different
        expect(screen.getByTestId("email-input")).toHaveValue("");
      },
      { timeout: 2000 }, // give mutation + re-render time
    );
  });

  it.todo("shows client-side validation error for invalid email");
  it.todo("shows error message on server failure");
  it.todo("disables button and shows loading state during submission");
});
