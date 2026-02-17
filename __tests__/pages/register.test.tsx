import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "../../src/trpc";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { router } from "../../src/router/router";
import { registerHandler } from "../../__mocks__/handlers/register";

describe("RegisterPage", () => {
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

    server.use(registerHandler);
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });

  afterAll(() => {
    server.close();
  });

  const renderRegister = () => {
    const history = createMemoryHistory({ initialEntries: ["/register"] });

    const testRouter = createRouter({
      routeTree: router.routeTree,
      history,
      context: {
        queryClient,
        trpcClient: trpc.createClient({
          links: [httpLink({ url: "/trpc" })],
        }),
      },
      defaultPreload: "intent",
    });

    render(
      <trpc.Provider
        client={trpc.createClient({ links: [httpLink({ url: "/trpc" })] })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={testRouter} />
        </QueryClientProvider>
      </trpc.Provider>
    );

    return { testRouter, history };
  };

  it("renders form fields, register button and login link", async () => {
    renderRegister();

    await waitFor(() => {
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
      expect(screen.getByTestId("register-button")).toBeInTheDocument();
      expect(screen.getByTestId("login-link")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("submits valid registration and shows success message", async () => {
    renderRegister();

    await waitFor(() => screen.getByTestId("email-input"));

    await userEvent.type(screen.getByTestId("email-input"), "newuser@example.com");
    await userEvent.type(screen.getByTestId("password-input"), "StrongPass123!");

    const form = screen.getByTestId("register-form");
    fireEvent.submit(form);

    await waitFor(() => {
      const message = screen.getByTestId("register-message");
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent(
        "Registration successful! Please check your email to verify your account."
      );
      expect(message).toHaveClass("text-green-500");
    }, { timeout: 8000 });
  });

  it("shows loading spinner during registration", async () => {
    renderRegister();

    await waitFor(() => screen.getByTestId("email-input"));

    await userEvent.type(screen.getByTestId("email-input"), "test@example.com");
    await userEvent.type(screen.getByTestId("password-input"), "password123");

    const form = screen.getByTestId("register-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId("register-loading")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("disables button during registration", async () => {
    renderRegister();

    await waitFor(() => screen.getByTestId("email-input"));

    await userEvent.type(screen.getByTestId("email-input"), "test@example.com");
    await userEvent.type(screen.getByTestId("password-input"), "password123");

    const button = screen.getByTestId("register-button");
    expect(button).not.toBeDisabled();

    const form = screen.getByTestId("register-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        const btn = screen.getByTestId("register-button");
        expect(btn).toHaveTextContent("Registering...");
        expect(btn).toBeDisabled();
      },
      { timeout: 5000 }
    );
  });

  it("shows error when email already exists", async () => {
    renderRegister();

    await waitFor(() => screen.getByTestId("email-input"), { timeout: 2000 });

    // FIRST ATTEMPT – success
    await userEvent.type(
      screen.getByTestId("email-input"),
      "duplicate@example.com"
    );
    await userEvent.type(
      screen.getByTestId("password-input"),
      "password123"
    );

    fireEvent.submit(screen.getByTestId("register-form"));

    await waitFor(
      () => {
        const messageEl = screen.getByTestId("register-message");
        expect(messageEl).toBeInTheDocument();
        expect(messageEl).toHaveTextContent(
          "Registration successful! Please check your email to verify your account."
        );
        expect(messageEl).toHaveClass("text-green-500");
      },
      { timeout: 8000 }
    );

    await new Promise((r) => setTimeout(r, 100));

    // SECOND ATTEMPT – error
    const emailInput = screen.getByTestId("email-input");
    const passwordInput = screen.getByTestId("password-input");

    await userEvent.clear(emailInput);
    await userEvent.clear(passwordInput);

    await userEvent.type(emailInput, "duplicate@example.com");
    await userEvent.type(passwordInput, "password123");

    fireEvent.submit(screen.getByTestId("register-form"));

    await waitFor(
      () => {
        const messageEl = screen.getByTestId("register-message");
        expect(messageEl).toBeInTheDocument();
        expect(messageEl).toHaveTextContent("Email already exists");
        expect(messageEl).toHaveClass("text-red-500");
      },
      { timeout: 8000 }
    );
  }, 15000);

  it.todo("shows validation errors for invalid email or short password");
});