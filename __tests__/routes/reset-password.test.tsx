// __tests__/routes/reset-password.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "@/trpc";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { router } from "@/router/router";

import {
  resetPasswordRequestHandler,
  delayedResetPasswordRequestHandler,
  resetPasswordRequestServerErrorHandler,
} from "../../__mocks__/handlers/resetPasswordRequest";

describe("Reset Password Route (/reset-password)", () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    // Default to happy-path fast success
    server.use(resetPasswordRequestHandler);

    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });

  afterAll(() => {
    server.close();
  });

  const renderResetPassword = () => {
    const history = createMemoryHistory({
      initialEntries: ["/reset-password"],
    });

    const testRouter = createRouter({
      routeTree: router.routeTree,
      history,
      context: {
        queryClient,
        trpcClient: trpc.createClient({
          links: [httpLink({ url: "http://localhost:8888/trpc" })],
        }),
      },
      defaultPreload: "intent",
    });

    render(
      <trpc.Provider
        client={trpc.createClient({
          links: [httpLink({ url: "http://localhost:8888/trpc" })],
        })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={testRouter} />
        </QueryClientProvider>
      </trpc.Provider>,
    );

    return { testRouter, history };
  };

  it("renders email input, submit button, and back-to-login link", async () => {
    renderResetPassword();

    await waitFor(
      () => {
        expect(screen.getByTestId("email-input")).toBeInTheDocument();
        expect(screen.getByTestId("submit-button")).toBeInTheDocument();
        expect(screen.getByTestId("back-to-login-link")).toBeInTheDocument();
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("submits valid email → shows success message and clears input", async () => {
    renderResetPassword();

    await waitFor(() => screen.getByTestId("email-input"));

    await userEvent.type(screen.getByTestId("email-input"), "user@example.com");

    const form = screen.getByTestId("reset-password-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        const message = screen.getByTestId("reset-password-message");
        expect(message).toBeInTheDocument();
        expect(message).toHaveTextContent(
          "If the email exists, a reset link has been sent.",
        );
        expect(message).toHaveClass("text-green-500");
        expect(screen.getByTestId("email-input")).toHaveValue("");
      },
      { timeout: 6000 },
    );
  });

  it("shows client-side validation error for invalid email", async () => {
    renderResetPassword();

    await waitFor(() => screen.getByTestId("email-input"));

    await userEvent.type(screen.getByTestId("email-input"), "invalid-email");

    const form = screen.getByTestId("reset-password-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        // Assuming <FormMessage /> renders the Zod error
        const error = screen.getByText(/valid email/i);
        expect(error).toBeInTheDocument();
        // Adjust class name if your shadcn/tailwind setup uses something else
        expect(error).toHaveClass("text-destructive");
        expect(
          screen.queryByTestId("reset-password-message"),
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("disables button and shows loading spinner during submission", async () => {
    // Use delayed variant to make loading state observable
    server.use(delayedResetPasswordRequestHandler);

    renderResetPassword();

    await waitFor(() => screen.getByTestId("email-input"));

    await userEvent.type(screen.getByTestId("email-input"), "test@example.com");

    const submitBtn = screen.getByTestId("submit-button");
    expect(submitBtn).not.toBeDisabled();

    fireEvent.submit(screen.getByTestId("reset-password-form"));

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

    // Optional: wait for completion to clean up
    await waitFor(() => expect(submitBtn).not.toBeDisabled(), {
      timeout: 4000,
    });
  });

  it("shows error message when server returns failure", async () => {
    server.use(resetPasswordRequestServerErrorHandler);

    renderResetPassword();

    await waitFor(() => screen.getByTestId("email-input"));

    await userEvent.type(screen.getByTestId("email-input"), "user@example.com");

    fireEvent.submit(screen.getByTestId("reset-password-form"));

    await waitFor(
      () => {
        const message = screen.getByTestId("reset-password-message");
        expect(message).toBeInTheDocument();
        expect(message).toHaveTextContent(/failed|error|try again/i);
        expect(message).toHaveClass("text-red-500");
      },
      { timeout: 5000 },
    );
  });

  it("navigates back to login when clicking 'Back to login' link", async () => {
    const { history } = renderResetPassword();

    await waitFor(() => screen.getByTestId("back-to-login-link"));

    await userEvent.click(screen.getByTestId("back-to-login-link"));

    await waitFor(
      () => {
        expect(history.location.pathname).toBe("/login");
      },
      { timeout: 2000 },
    );
  });

  // Optional future tests:
  // it.todo("handles rate-limit error gracefully");
  // it.todo("prevents double submission while pending");
});
