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
import { router } from "../../src/router";
import { loginHandler } from "../../__mocks__/handlers";
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

  const setup = async (initialPath = "/login") => {
    const history = createMemoryHistory({ initialEntries: [initialPath] });
    const testRouter = createRouter({ routeTree: router.routeTree, history });

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

    return { history, testRouter };
  };

  const waitForFormReady = async () =>
    waitFor(() => screen.getByTestId("login-form"), { timeout: 2000 });

  const fillAndSubmit = async (email: string, password: string) => {
    const emailInput = screen.getByTestId("email-input");
    const passwordInput = screen.getByTestId("password-input");

    await userEvent.clear(emailInput);
    await userEvent.clear(passwordInput);
    await userEvent.type(emailInput, email);
    await userEvent.type(passwordInput, password);

    const form = screen.getByTestId("login-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  };

  const expectAuthStoreUpdated = async () => {
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
  };

  const expectErrorMessage = async (text: string | RegExp) => {
    const message = await waitFor(() => screen.getByTestId("login-message"), {
      timeout: 3500,
    });
    expect(message).toHaveTextContent(text);
    expect(message).toHaveClass("text-red-500");
  };

  const expectLoadingState = async (isLoading: boolean) => {
    await waitFor(
      () => {
        const btn = screen.getByTestId("login-button");
        expect(btn).toHaveTextContent(isLoading ? "Logging in..." : "Login");
        expect(btn).toHaveProperty("disabled", isLoading);
      },
      { timeout: 2500 },
    );
  };

  it("renders form fields, heading, button, links", async () => {
    await setup();
    await waitForFormReady();

    expect(
      screen.getByRole("heading", { name: /login to your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByTestId("forgot-password-link")).toBeInTheDocument();
  });

  it("successful login → updates auth store", async () => {
    server.use(loginHandler);

    await setup();
    await waitForFormReady();

    await fillAndSubmit("testuser@example.com", "password123");

    await expectAuthStoreUpdated();
  });

  it("invalid credentials → shows error, keeps store unauthenticated", async () => {
    server.use(
      trpcMsw.login.mutation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }),
    );

    await setup();
    await waitForFormReady();

    await fillAndSubmit("wronguser@example.com", "wrongpassword");

    await expectErrorMessage("Invalid email or password");
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it("client-side validation errors on invalid input", async () => {
    await setup();
    await waitForFormReady();

    await fillAndSubmit("invalid-email", "short");

    await waitFor(
      () => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows loading state during submission (failed case)", async () => {
    server.use(
      trpcMsw.login.mutation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }),
    );

    await setup();
    await waitForFormReady();

    const loginButton = screen.getByTestId("login-button");
    expect(loginButton).not.toBeDisabled();
    expect(loginButton).toHaveTextContent("Login");

    await fillAndSubmit("wronguser@example.com", "wrongpassword");

    await expectLoadingState(true);

    await waitFor(() => expectLoadingState(false), { timeout: 3000 });

    await expectErrorMessage(/invalid email or password/i);
  });

  it("forgot password link is rendered correctly", async () => {
    await setup();
    await waitForFormReady();

    const link = screen.getByTestId("forgot-password-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#");
    expect(link).toHaveTextContent("Forgot your password?");
  });
});
