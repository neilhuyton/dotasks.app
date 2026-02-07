// __tests__/Register.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { trpc } from "../src/trpc";
import { server } from "../__mocks__/server";
import "@testing-library/jest-dom";
import { act } from "react";
import { useAuthStore } from "../src/store/authStore";
import { registerHandler } from "../__mocks__/handlers/register";
import { router } from "../src/router/router";

describe("Register Component Email Verification", () => {
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
        fetch: async (input, options) => fetch(input, { ...options }),
      }),
    ],
  });

  const setup = async () => {
    const history = createMemoryHistory({ initialEntries: ["/register"] });
    const testRouter = createRouter({
      routeTree: router.routeTree,
      history,
    });

    await act(async () => {
      render(
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={testRouter} />
          </QueryClientProvider>
        </trpc.Provider>,
      );
    });
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
    server.use(registerHandler);
    process.on("unhandledRejection", (reason) => {
      if (
        reason instanceof Error &&
        (reason.message.includes("Email already exists") ||
          reason.message.includes("Email and password are required") ||
          reason.message.includes("Invalid email address") ||
          reason.message.includes("Password must be at least 8 characters"))
      ) {
        return;
      }
      throw reason;
    });
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({ isLoggedIn: false, userId: null });
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
    process.removeAllListeners("unhandledRejection");
  });

  it("displays email verification prompt after successful registration", async () => {
    await setup();

    await waitFor(() => {
      expect(screen.getByText("Create an account")).toBeInTheDocument();
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
      expect(screen.getByTestId("register-button")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId("email-input"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByTestId("register-button"));
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("register-message")).toHaveTextContent(
          "Registration successful! Please check your email to verify your account.",
        );
        expect(screen.getByTestId("register-message")).toHaveClass(
          "text-green-500",
        );
      },
      { timeout: 2000 },
    );
  });
});
