// __tests__/VerifyEmail.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "../src/trpc";
import { server } from "../__mocks__/server";
import { useAuthStore } from "../src/store/authStore";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { createMemoryHistory } from "@tanstack/history";
import { router } from "../src/router/router";
import "@testing-library/jest-dom";

import { verifyEmailHandler } from "../__mocks__/handlers/verifyEmail";
import { mockUsers, type MockUser } from "../__mocks__/mockUsers";

describe("Email Verification", () => {
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
        fetch: async (input, options) => {
          const headers = {
            ...options?.headers,
            "Content-Type": "application/json",
          };
          return fetch(input, { ...options, headers });
        },
      }),
    ],
  });

  const initialMockUsers: MockUser[] = JSON.parse(JSON.stringify(mockUsers));

  const setup = async (initialPath: string, token: string) => {
    const history = createMemoryHistory({
      initialEntries: [`${initialPath}?token=${token}`],
    });
    const testRouter = createRouter({
      ...router.options,
      history,
      routeTree: router.routeTree,
    });

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={testRouter} />
        </QueryClientProvider>
      </trpc.Provider>,
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
    server.use(verifyEmailHandler);
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      token: null,
      refreshToken: null,
    });
    queryClient.clear();
    mockUsers.length = 0;
    mockUsers.push(...JSON.parse(JSON.stringify(initialMockUsers)));
  });

  afterAll(() => {
    server.close();
  });

  it("successfully verifies email with valid token", async () => {
    const validToken = "42c6b154-c097-4a71-9b34-5b28669ea467";
    await setup("/verify-email", validToken);

    await waitFor(
      () => {
        expect(screen.getByText("Email Verification")).toBeInTheDocument();
        expect(screen.getByTestId("verify-message")).toBeInTheDocument();
        expect(screen.getByTestId("verify-message")).toHaveTextContent(
          "Email verified successfully!",
        );
        expect(screen.getByTestId("verify-message")).toHaveClass(
          "text-green-500",
        );
      },
      { timeout: 2000 },
    );
  });

  it("displays error message for invalid or expired verification token", async () => {
    const invalidToken = "00000000-0000-0000-0000-000000000000";
    await setup("/verify-email", invalidToken);

    await waitFor(
      () => {
        expect(screen.getByTestId("verify-message")).toBeInTheDocument();
        expect(screen.getByTestId("verify-message")).toHaveTextContent(
          "Invalid or expired verification token",
        );
        expect(screen.getByTestId("verify-message")).toHaveClass(
          "text-red-500",
        );
      },
      { timeout: 3000 },
    );
  });

  it("displays error message for already verified email", async () => {
    const token = "987fcdeb-12d3-4e5a-9876-426614174000";
    await setup("/verify-email", token);

    await waitFor(
      () => {
        expect(screen.getByTestId("verify-message")).toBeInTheDocument();
        expect(screen.getByTestId("verify-message")).toHaveTextContent(
          "Email already verified",
        );
        expect(screen.getByTestId("verify-message")).toHaveClass(
          "text-red-500",
        );
      },
      { timeout: 2000 },
    );
  });

  it("displays verifying message during verification process", async () => {
    const token = "42c6b154-c097-4a71-9b34-5b28669ea467";
    await setup("/verify-email", token);

    await waitFor(
      () => {
        expect(screen.getByTestId("verify-email-loading")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(screen.getByTestId("verify-message")).toBeInTheDocument();
        expect(screen.getByTestId("verify-message")).toHaveTextContent(
          "Email verified successfully!",
        );
      },
      { timeout: 3000 },
    );
  });
});
