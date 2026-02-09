import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { trpc } from "../src/trpc";
import { server } from "../__mocks__/server";
import "@testing-library/jest-dom";
import { useAuthStore } from "../src/store/authStore";
import { registerHandler } from "../__mocks__/handlers/register";
import { router } from "../src/router/router";
import { suppressActWarnings } from "./act-suppress"; 

// suppress act warnings due to reacy qury/
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
      </trpc.Provider>
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
    server.use(registerHandler);
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({ isLoggedIn: false, userId: null });
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it("displays email verification prompt after successful registration", async () => {
    await setup();

    await waitFor(() => {
      expect(screen.getByText("Create an account")).toBeInTheDocument();
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.change(screen.getByTestId("email-input"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-input"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByTestId("register-button"));

    await waitFor(
      () => {
        const msg = screen.getByTestId("register-message");
        expect(msg).toHaveTextContent(
          "Registration successful! Please check your email to verify your account."
        );
        expect(msg).toHaveClass("text-green-500");
      },
      { timeout: 5000 }
    );
  }, 10000);
});