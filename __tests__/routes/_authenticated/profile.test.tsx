// __tests__/pages/profile.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
} from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import { server } from "../../../__mocks__/server";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import {
  getCurrentUserLoadingHandler,
  updateEmailHandler,
  updateEmailSuccessHandler,
  sendPasswordResetHandler,
} from "../../../__mocks__/handlers/profile";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { mockUsers } from "../../../__mocks__/mockUsers";

describe("Profile Route (/_authenticated/profile)", () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-access-token-for-tests",
      refreshToken: "mock-refresh-token-for-tests",
    });

    mockUsers.length = 0;
    mockUsers.push(
      {
        id: "test-user-123",
        email: "testuser@example.com",
        password:
          "$2b$10$BfZjnkEBinREhMQwsUwFjOdeidxX1dvXSKn.n3MxdwmRTcfV8JR16",
        verificationToken: null,
        isEmailVerified: true,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        createdAt: new Date(),          // ← fixed: Date object instead of string
        updatedAt: new Date(),          // ← fixed: Date object instead of string

      },
      {
        id: "other-user-999",
        email: "already.taken@example.com",
        password: "whatever",
        verificationToken: null,
        isEmailVerified: true,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        createdAt: new Date(),          // ← fixed
        updatedAt: new Date(),          // ← fixed

      },
    );

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    server.resetHandlers();

    server.use(
      trpcMsw.user.getCurrent.query(() => ({
        id: "test-user-123",
        email: "testuser@example.com",
      })),
    );

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterAll(() => {
    server.close();
  });

  const createTestRouter = (initialPath = "/profile") => {
    const history = createMemoryHistory({ initialEntries: [initialPath] });
    return createRouter({ routeTree, history });
  };

  const renderProfile = async () => {
    const testRouter = createTestRouter();

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

    // Give React Query / TanStack Router time to settle
    await new Promise((r) => setTimeout(r, 300));
    return { history: testRouter.history };
  };

  it("renders the profile modal UI with title, current email, forms and logout", async () => {
    await renderProfile();

    await screen.findByText("User Profile");
    expect(screen.getByTestId("current-email")).toHaveTextContent(
      "testuser@example.com",
    );
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
  });

  it("shows loading skeleton while fetching current user", async () => {
    server.use(getCurrentUserLoadingHandler);
    await renderProfile();

    await screen.findByTestId("email-skeleton");
  });

  it("submits email change – success", async () => {
    server.use(updateEmailSuccessHandler);

    await renderProfile();

    const emailInput = await screen.findByTestId("email-input");
    await user.type(emailInput, "newemail@example.com");

    const form = screen.getByTestId("email-form");
    fireEvent.submit(form);

    const successMsg = await screen.findByTestId("email-success");
    expect(successMsg).toHaveTextContent(/success|updated/i);
  });

  it("shows error when new email is already taken", async () => {
    server.use(updateEmailHandler);

    await renderProfile();

    const emailInput = await screen.findByTestId("email-input");
    await user.clear(emailInput);
    await user.type(emailInput, "already.taken@example.com");

    const form = screen.getByTestId("email-form");
    fireEvent.submit(form);

    const errorMsg = await screen.findByTestId("email-error");
    expect(errorMsg.textContent?.toLowerCase()).toMatch(
      /already in use|conflict|taken/i,
    );
    expect(errorMsg).toHaveClass("text-red-500");
  });

  it("sends password reset link successfully", async () => {
    server.use(sendPasswordResetHandler);

    await renderProfile();

    const passwordInput = await screen.findByTestId("password-input");
    await user.type(passwordInput, "user@example.com");

    const form = screen.getByTestId("password-form");
    fireEvent.submit(form);

    const msg = await screen.findByTestId("password-success");
    expect(msg).toHaveTextContent(/sent|reset link/i);
  });

  it("disables submit buttons and shows loading spinner during mutation", async () => {
    server.use(
      trpcMsw.user.updateEmail.mutation(async ({ input }) => {
        await new Promise((r) => setTimeout(r, 1200));
        return { message: "Email updated successfully", email: input.email };
      }),
    );

    await renderProfile();

    const emailInput = await screen.findByTestId("email-input");
    await user.type(emailInput, "loading@example.com");

    const form = screen.getByTestId("email-form");
    fireEvent.submit(form);

    const submitBtn = screen.getByTestId("email-submit");
    await waitFor(
      () => {
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent(/updating/i);
      },
      { timeout: 2000 },
    );

    await waitFor(() => expect(submitBtn).not.toBeDisabled(), {
      timeout: 3000,
    });
  });

  it("shows client-side validation error for invalid email format", async () => {
    await renderProfile();

    const emailInput = await screen.findByTestId("email-input");
    await user.type(emailInput, "invalid-email");

    const form = screen.getByTestId("email-form");
    fireEvent.submit(form);

    const error = await screen.findByTestId("email-validation-error");
    expect(error).toHaveTextContent(/valid email/i);
  });

  it("closes the modal and navigates to /lists on close button click", async () => {
    const { history } = await renderProfile();

    const closeBtn = await screen.findByLabelText(/close profile/i);
    await user.click(closeBtn);

    await waitFor(() => {
      expect(history.location.pathname).toBe("/lists");
    });
  });

  it("triggers logout on Logout button click", async () => {
    const mockLogout = vi.fn();
    vi.spyOn(useAuthStore.getState(), "logout").mockImplementation(mockLogout);

    await renderProfile();

    const logoutBtn = await screen.findByTestId("logout-button");
    await user.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("handles case where current email fetch fails (shows fallback)", async () => {
    server.use(
      trpcMsw.user.getCurrent.query(() => {
        throw new Error("Failed to fetch user");
      }),
    );

    await renderProfile();

    await screen.findByText(/not available/i);
  });
});