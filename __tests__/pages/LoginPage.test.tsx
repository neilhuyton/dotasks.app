// __tests__/pages/LoginPage.test.tsx
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
import { trpc } from "../../src/trpc";
import { httpLink } from "@trpc/client";
import { useAuthStore } from "../../src/store/authStore";
import "@testing-library/jest-dom";
import { server } from "../../__mocks__/server";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { router } from "../../src/router/router";
import {
  loginHandler,
  weightDeleteHandler,
  weightGetCurrentGoalHandler,
  weightGetWeightsHandler,
} from "../../__mocks__/handlers";
import { suppressActWarnings } from "../act-suppress"; 
import { trpcMsw } from "../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

suppressActWarnings();

describe("LoginPage", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const setup = async (initialPath = "/login") => {
    const history = createMemoryHistory({ initialEntries: [initialPath] });
    const testRouter = createRouter({ routeTree: router.routeTree, history });

    await waitFor(() => {
      render(
        <trpc.Provider
          client={trpc.createClient({
            links: [
              httpLink({
                url: "/trpc",
              }),
            ],
          })}
          queryClient={queryClient}
        >
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={testRouter} />
          </QueryClientProvider>
        </trpc.Provider>,
      );
    });

    return { history, testRouter };
  };

  const fillAndSubmitForm = async (email: string, password: string) => {
    const emailInput = await screen.findByTestId("email-input");
    const passwordInput = await screen.findByTestId("password-input");
    const form = await screen.findByTestId("login-form");

    await userEvent.clear(emailInput);
    await userEvent.clear(passwordInput);
    await userEvent.type(emailInput, email);
    await userEvent.type(passwordInput, password);

    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" });

    vi.mock("jwt-decode", () => ({
      jwtDecode: vi.fn((token: string) => {
        if (
          token ===
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSJ9.dummy-signature"
        ) {
          return { userId: "test-user-1" };
        }
        throw new Error("Invalid token");
      }),
    }));

    process.on("unhandledRejection", (reason) => {
      if (
        reason instanceof Error &&
        reason.message.includes("Invalid email or password")
      ) {
        return;
      }
      throw reason;
    });
  });

  beforeEach(() => {
    server.use(
      weightGetWeightsHandler,
      weightDeleteHandler,
      weightGetCurrentGoalHandler,
    );

    queryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
    process.removeAllListeners("unhandledRejection");
  });

  it("renders form fields and controls", async () => {
    await setup();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /login to your account/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /login/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /sign up/i }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("forgot-password-link")).toBeInTheDocument();
    });
  });

  it("successfully logs in and updates auth store", async () => {
    server.use(loginHandler);

    await setup();

    await waitFor(() => screen.getByTestId("login-form"), { timeout: 1500 });

    await fillAndSubmitForm("testuser@example.com", "password123");

    await waitFor(
      () => {
        const state = useAuthStore.getState();
        expect(state.isLoggedIn).toBe(true);
        expect(state.userId).toBe("test-user-1");
        expect(state.accessToken).toBeTruthy();
        expect(state.refreshToken).toBeTruthy();
      },
      { timeout: 4000 },
    );
  });

  it("shows error message on invalid credentials", async () => {
    // Force failure for this test only
    server.use(
      trpcMsw.login.mutation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }),
      weightGetWeightsHandler,
      weightDeleteHandler,
      weightGetCurrentGoalHandler,
    );

    await setup();

    await waitFor(() => screen.getByTestId("login-form"));

    await fillAndSubmitForm("wronguser@example.com", "wrongpassword");

    await waitFor(
      () => {
        const message = screen.getByTestId("login-message");
        expect(message).toHaveTextContent(
          "Login failed: Invalid email or password",
        );
        expect(message).toHaveClass("text-red-500");
        expect(useAuthStore.getState().isLoggedIn).toBe(false);
      },
      { timeout: 3000 },
    );
  });

  it("shows validation errors for invalid input", async () => {
    await setup();

    await waitFor(() => screen.getByTestId("login-form"));

    const emailInput = screen.getByTestId("email-input");
    const passwordInput = screen.getByTestId("password-input");

    await userEvent.type(emailInput, "invalid-email");
    await userEvent.type(passwordInput, "short");
    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it("disables button and shows loading state during failed login", async () => {
    server.use(
      trpcMsw.login.mutation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }),
      weightGetWeightsHandler,
      weightDeleteHandler,
      weightGetCurrentGoalHandler,
    );

    await setup();

    await waitFor(() => screen.getByTestId("login-form"));

    const loginButton = screen.getByTestId("login-button");
    expect(loginButton).not.toBeDisabled();
    expect(loginButton).toHaveTextContent("Login");

    await fillAndSubmitForm("wronguser@example.com", "wrongpassword");

    await waitFor(() => {
      expect(loginButton).toBeDisabled();
      expect(loginButton).toHaveTextContent("Logging in...");
    });

    await waitFor(
      () => {
        expect(loginButton).not.toBeDisabled();
        expect(loginButton).toHaveTextContent("Login");
        expect(screen.getByTestId("login-message")).toHaveTextContent(
          /invalid email or password/i,
        );
      },
      { timeout: 3000 },
    );
  });

  it("renders forgot password link correctly", async () => {
    await setup();

    await waitFor(() => {
      const link = screen.getByTestId("forgot-password-link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "#");
      expect(link).toHaveTextContent("Forgot your password?");
    });
  });
});