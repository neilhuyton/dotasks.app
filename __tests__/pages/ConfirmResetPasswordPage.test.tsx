// __tests__/pages/ConfirmResetPasswordPage.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { httpLink } from "@trpc/client";
import { trpc } from "../../src/trpc";
import "@testing-library/jest-dom";
import { server } from "../../__mocks__/server";
import { resetPasswordConfirmHandler } from "../../__mocks__/handlers/resetPasswordConfirm";
import ConfirmResetPasswordPage from "../../src/pages/ConfirmResetPasswordPage";
import { suppressActWarnings } from "../act-suppress";

suppressActWarnings();

// Mock router.navigate
vi.mock("../../src/router/router", () => ({
  router: {
    navigate: vi.fn(),
  },
}));

describe("ConfirmResetPasswordPage", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const rootRoute = createRootRoute();

  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/confirm-reset-password",
    validateSearch: () => ({ token: "123e4567-e89b-12d3-a456-426614174000" }),
    component: ConfirmResetPasswordPage,
  });

  const routeTree = rootRoute.addChildren([testRoute]);

  const createTestRouter = (initialToken = "123e4567-e89b-12d3-a456-426614174000") => {
    const history = createMemoryHistory({
      initialEntries: [`/confirm-reset-password?token=${initialToken}`],
    });

    return createRouter({
      routeTree,
      history,
      defaultPendingMinMs: 0,
    });
  };

  const renderPage = (token = "123e4567-e89b-12d3-a456-426614174000") => {
    const testRouter = createTestRouter(token);

    // Use a real httpLink so mutations can be intercepted by MSW
    const testTrpcClient = trpc.createClient({
      links: [
        httpLink({
          url: "/trpc",
          fetch: (input, init) => fetch(input, init),
        }),
      ],
    });

    render(
      <trpc.Provider client={testTrpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={testRouter} />
        </QueryClientProvider>
      </trpc.Provider>
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
    server.use(resetPasswordConfirmHandler);

    process.on("unhandledRejection", (reason) => {
      if (reason instanceof Error) {
        if (
          reason.message.includes("Token and new password are required") ||
          reason.message.includes("Invalid or expired token")
        ) {
          return;
        }
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

  it("submits valid token and new password and displays success message", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("confirm-reset-password-form")).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId("password-input");
    await userEvent.type(passwordInput, "newSecurePassword123");

    const form = screen.getByTestId("confirm-reset-password-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await waitFor(
      () => {
        const message = screen.getByTestId("confirm-reset-password-message");
        expect(message).toBeInTheDocument();
        expect(message).toHaveTextContent(/successfully/i);
        expect(message).toHaveClass("text-green-500");
      },
      { timeout: 3000 }
    );
  });
});