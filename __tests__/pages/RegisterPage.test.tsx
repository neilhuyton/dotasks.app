// __tests__/pages/RegisterPage.test.tsx

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
import { httpLink } from "@trpc/client";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { trpc } from "../../src/trpc";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";
import { useAuthStore } from "../../src/store/authStore";
import {
  registerHandler,
  resetMockUsers,
} from "../../__mocks__/handlers/register";
import { router } from "../../src/router/router";
import { suppressActWarnings } from "../act-suppress";

suppressActWarnings();

describe("Register Component Email Verification", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  });

  const setup = async () => {
    const history = createMemoryHistory({ initialEntries: ["/register"] });
    const testRouter = createRouter({ routeTree: router.routeTree, history });

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={testRouter} />
        </QueryClientProvider>
      </trpc.Provider>,
    );

    return userEvent.setup();
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
    server.use(registerHandler);
  });

  afterEach(() => {
    server.resetHandlers();
    resetMockUsers();
    useAuthStore.setState({ isLoggedIn: false, userId: null });
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it("displays email verification prompt after successful registration", async () => {
    const user = await setup();

    await waitFor(
      () => {
        expect(screen.getByText("Create an account")).toBeInTheDocument();
        expect(screen.getByTestId("email-input")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    await user.type(screen.getByTestId("email-input"), "test@example.com");
    await user.type(screen.getByTestId("password-input"), "password123");

    const form = await screen.findByTestId("register-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await waitFor(
      () => {
        const msg = screen.getByTestId("register-message");
        expect(msg).toBeInTheDocument();
        expect(msg).toHaveTextContent(
          "Registration successful! Please check your email to verify your account.",
        );
        expect(msg).toHaveClass("text-green-500");
      },
      { timeout: 10000 },
    );
  }, 20000);
});
