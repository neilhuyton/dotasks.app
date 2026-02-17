// __tests__/pages/profile.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import { server } from "../../__mocks__/server";
import { router } from "@/router/router";
import { useAuthStore } from "@/store/authStore";
import {
  getCurrentUserHandler,
  getCurrentUserLoadingHandler,
  updateEmailHandler,
  updateEmailSuccessHandler,
  sendPasswordResetHandler,
} from "../../__mocks__/handlers/profile";
import { trpcMsw } from "../../__mocks__/trpcMsw";
import { act } from "react-dom/test-utils";

describe("Profile Route (/_authenticated/profile)", () => {
  let queryClient: QueryClient;
  const testHistory = createMemoryHistory({ initialEntries: ["/profile"] });

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    // Set auth state FIRST and force replace
    useAuthStore.setState(
      {
        isLoggedIn: true,
        userId: "test-user-123",
      },
      true, // force immediate update
    );

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    server.resetHandlers();
    server.use(getCurrentUserHandler);

    router.history = testHistory;

    // Silence common test noise
    vi.spyOn(console, "error").mockImplementation((msg) => {
      if (
        typeof msg === "string" &&
        (msg.includes("act") ||
          msg.includes("unhandled request") ||
          msg.includes("DismissableLayer") ||
          msg.includes("Presence") ||
          msg.includes("FocusScope"))
      ) {
        return;
      }
      console.error(msg);
    });
  });

  afterEach(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    server.resetHandlers();
    useAuthStore.setState({ isLoggedIn: false, userId: null });
  });

  afterAll(() => {
    server.close();
  });

  const renderProfile = async () => {
    await act(async () => {
      render(
        <trpc.Provider
          client={trpc.createClient({ links: [httpLink({ url: "/trpc" })] })}
          queryClient={queryClient}
        >
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </trpc.Provider>,
      );
    });
    // Small tick for router settle
    await new Promise((r) => setTimeout(r, 0));
    return { history: testHistory };
  };

  it("renders the profile modal UI with title, current email, forms and logout", async () => {
    await renderProfile();

    await waitFor(
      () => {
        expect(screen.getByText("User Profile")).toBeInTheDocument();
        expect(screen.getByText("Account Information")).toBeInTheDocument();
        expect(screen.getByTestId("current-email")).toHaveTextContent("testuser@example.com");
        expect(screen.getByTestId("email-input")).toBeInTheDocument();
        expect(screen.getByTestId("password-input")).toBeInTheDocument();
        expect(screen.getByTestId("email-submit")).toHaveTextContent("Update Email");
        expect(screen.getByTestId("password-submit")).toHaveTextContent("Send Reset Link");
        expect(screen.getByTestId("logout-button")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows loading skeleton while fetching current user", async () => {
    server.use(getCurrentUserLoadingHandler);

    await renderProfile();

    await waitFor(
      () => {
        expect(screen.getByTestId("email-skeleton")).toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });

  it("submits email change – success", async () => {
    const user = userEvent.setup();
    server.use(updateEmailSuccessHandler);

    await renderProfile();

    await waitFor(() => screen.getByTestId("email-input"), { timeout: 1500 });

    await user.type(screen.getByTestId("email-input"), "newemail@example.com");
    await user.click(screen.getByTestId("email-submit"));

    await waitFor(
      () => {
        const msg = screen.getByTestId("email-success");
        expect(msg).toBeInTheDocument();
        expect(msg).toHaveTextContent(/success|updated/i);
      },
      { timeout: 2000 },
    );
  });

  it("shows error when new email is already taken", async () => {
    const user = userEvent.setup();
    server.use(updateEmailHandler);

    await renderProfile();

    await waitFor(() => screen.getByTestId("email-input"), { timeout: 1500 });

    await user.type(screen.getByTestId("email-input"), "existing@example.com");
    await user.click(screen.getByTestId("email-submit"));

    await waitFor(
      () => {
        const error = screen.getByTestId("email-error");
        expect(error).toBeInTheDocument();
        expect(error).toHaveTextContent(/already|in use|conflict/i);
      },
      { timeout: 2000 },
    );
  });

  it("sends password reset link successfully", async () => {
    const user = userEvent.setup();
    server.use(sendPasswordResetHandler);

    await renderProfile();

    await waitFor(() => screen.getByTestId("password-input"), { timeout: 1500 });

    await user.type(screen.getByTestId("password-input"), "user@example.com");
    await user.click(screen.getByTestId("password-submit"));

    await waitFor(
      () => {
        const msg = screen.getByTestId("password-success");
        expect(msg).toBeInTheDocument();
        expect(msg).toHaveTextContent(/sent|check.*email|reset link/i);
      },
      { timeout: 2000 },
    );
  });

  it("closes the modal and navigates to /lists on close button click", async () => {
    const { history } = await renderProfile();

    await waitFor(() => screen.getByLabelText(/close profile/i), { timeout: 1500 });

    await userEvent.click(screen.getByLabelText(/close profile/i));

    await waitFor(
      () => {
        expect(history.location.pathname).toBe("/lists");
      },
      { timeout: 1500 },
    );
  });

  it("triggers logout on Logout button click", async () => {
    const mockLogout = vi.fn();
    vi.spyOn(useAuthStore.getState(), "logout")?.mockImplementation(mockLogout);

    await renderProfile();

    await waitFor(() => screen.getByTestId("logout-button"), { timeout: 1500 });

    await userEvent.click(screen.getByTestId("logout-button"));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("disables submit buttons and shows loading spinner during mutation", async () => {
    const user = userEvent.setup();

    server.use(
      trpcMsw.user.updateEmail.mutation(async ({ input }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay
        return {
          message: "Email updated successfully",
          email: input.email, // Fix: match your server return type
        };
      }),
    );

    await renderProfile();

    await waitFor(() => screen.getByTestId("email-input"), { timeout: 1500 });

    await user.type(screen.getByTestId("email-input"), "loading@example.com");
    await user.click(screen.getByTestId("email-submit"));

    expect(screen.getByTestId("email-submit")).toBeDisabled();
    expect(screen.getByTestId("email-submit")).toHaveTextContent("Updating...");

    await waitFor(
      () => {
        expect(screen.queryByText("Updating...")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows client-side validation error for invalid email format", async () => {
    const user = userEvent.setup();

    await renderProfile();

    await waitFor(() => screen.getByTestId("email-input"), { timeout: 1500 });

    await user.type(screen.getByTestId("email-input"), "invalid-email");
    await user.click(screen.getByTestId("email-submit"));

    await waitFor(
      () => {
        const error = screen.getByTestId("email-validation-error");
        expect(error).toBeInTheDocument();
        expect(error).toHaveTextContent(/valid email/i);
      },
      { timeout: 1500 },
    );
  });

  it("handles case where current email fetch fails (error boundary or fallback)", async () => {
    server.use(
      trpcMsw.user.getCurrent.query(() => {
        throw new Error("Failed to fetch user");
      }),
    );

    await renderProfile();

    await waitFor(
      () => {
        expect(screen.getByText(/not available/i)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});