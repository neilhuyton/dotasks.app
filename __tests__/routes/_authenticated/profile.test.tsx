// __tests__/routes/_authenticated/profile.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../__mocks__/server";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { mockUsers } from "../../../__mocks__/mockUsers";
import { useAuthStore } from "@/store/authStore";

import {
  renderWithTrpcRouter,
  expectSuccessMessage,
  expectErrorMessage,
} from "../../utils/test-helpers";

import {
  getCurrentUserLoadingHandler,
  updateEmailSuccessHandler,
  updateEmailHandler,
  sendPasswordResetHandler,
} from "../../../__mocks__/handlers/profile";

import { routeTree } from "@/routeTree.gen";

const USER_ID = "test-user-123";
const INITIAL_EMAIL = "testuser@example.com";

function renderProfile(initialPath = "/profile") {
  return renderWithTrpcRouter({
    initialPath,
    routeTree,
  });
}

describe("Profile Route (/_authenticated/profile)", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    server.resetHandlers();

    useAuthStore.setState({
      isLoggedIn: true,
      userId: USER_ID,
      accessToken: "mock-access-token-for-tests",
      refreshToken: "mock-refresh-token-for-tests",
    });

    mockUsers.length = 0;
    mockUsers.push(
      {
        id: USER_ID,
        email: INITIAL_EMAIL,
        password:
          "$2b$10$BfZjnkEBinREhMQwsUwFjOdeidxX1dvXSKn.n3MxdwmRTcfV8JR16",
        verificationToken: null,
        isEmailVerified: true,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "other-user-999",
        email: "already.taken@example.com",
        password: "whatever",
        verificationToken: null,
        isEmailVerified: true,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    server.use(
      trpcMsw.user.getCurrent.query(() => ({
        id: USER_ID,
        email: INITIAL_EMAIL,
      })),
    );

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterAll(() => server.close());

  it("renders profile modal with title and current email", async () => {
    renderProfile();

    await screen.findByText("User Profile");

    const currentEmailEl = await screen.findByTestId(
      "current-email",
      {},
      { timeout: 1500 },
    );
    expect(currentEmailEl).toHaveTextContent(INITIAL_EMAIL);
    expect(currentEmailEl).toBeVisible();
    expect(currentEmailEl).toHaveClass("text-base", "font-medium", "break-all");

    await screen.findByTestId("email-input");
    await screen.findByTestId("logout-button");
  });

  it("shows loading skeleton while fetching current user", async () => {
    server.use(getCurrentUserLoadingHandler);
    renderProfile();
    await screen.findByTestId("email-skeleton");
  });

  it("submits email change – success", async () => {
    server.use(updateEmailSuccessHandler);
    renderProfile();

    const emailInput = await screen.findByTestId("email-input");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "newemail@example.com");

    const form = screen.getByTestId("email-form");
    fireEvent.submit(form);

    await expectSuccessMessage(
      "email-success",
      /success|updated/i,
      "text-green-500",
      4000,
    );
  });

  it("shows error when new email is already taken", async () => {
    server.use(updateEmailHandler);
    renderProfile();

    const emailInput = await screen.findByTestId("email-input");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "already.taken@example.com");

    const form = screen.getByTestId("email-form");
    fireEvent.submit(form);

    await expectErrorMessage(
      "email-error",
      /already in use|conflict|taken/i,
      "text-red-500",
      4000,
    );
  });

  it("sends password reset link successfully", async () => {
    server.use(sendPasswordResetHandler);
    renderProfile();

    const emailInput = await screen.findByTestId("password-input");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, INITIAL_EMAIL);

    const form = screen.getByTestId("password-form");
    fireEvent.submit(form);

    await expectSuccessMessage(
      "password-success",
      /sent|reset link/i,
      "text-green-500",
      4000,
    );
  });

  it("disables submit button and shows loading state during mutation", async () => {
    server.use(
      trpcMsw.user.updateEmail.mutation(async ({ input }) => {
        await new Promise((r) => setTimeout(r, 1200));
        return { message: "Email updated", email: input.email };
      }),
    );

    renderProfile();

    const emailInput = await screen.findByTestId("email-input");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "loading@example.com");

    const form = screen.getByTestId("email-form");
    fireEvent.submit(form);

    const submitBtn = await screen.findByTestId("email-submit");
    await waitFor(
      () => {
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent(/updating/i);
      },
      { timeout: 1800 },
    );

    await waitFor(() => expect(submitBtn).not.toBeDisabled(), {
      timeout: 3000,
    });
  });

  it("shows client-side validation error for invalid email", async () => {
    renderProfile();

    const emailInput = await screen.findByTestId("email-input");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "invalid-email");

    const form = screen.getByTestId("email-form");
    fireEvent.submit(form);

    const errorEl = await screen.findByTestId("email-validation-error");
    expect(errorEl).toHaveTextContent(/valid email/i);
  });

  it("closes modal and navigates back to /lists", async () => {
    const { history } = renderProfile();

    const closeBtn = await screen.findByLabelText(/close profile/i);
    await userEvent.click(closeBtn);

    await waitFor(() => expect(history.location.pathname).toBe("/lists"), {
      timeout: 2000,
    });
  });

  it("triggers logout when Logout button is clicked", async () => {
    const mockLogout = vi.fn();
    vi.spyOn(useAuthStore.getState(), "logout").mockImplementation(mockLogout);

    renderProfile();

    const logoutBtn = await screen.findByTestId("logout-button");
    await userEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("shows fallback UI when current user fetch fails", async () => {
    server.use(
      trpcMsw.user.getCurrent.query(() => {
        throw new Error("Failed to fetch user");
      }),
    );

    renderProfile();

    await waitFor(
      () => {
        // Title stays visible
        expect(screen.getByText("User Profile")).toBeInTheDocument();

        // Email display shows fallback text (your current behavior)
        expect(screen.getByText("Not available")).toBeInTheDocument();
        expect(screen.queryByTestId("current-email")).not.toBeInTheDocument();

        // Forms are still rendered (current reality)
        expect(screen.getByTestId("email-input")).toBeInTheDocument();
        expect(screen.getByTestId("password-input")).toBeInTheDocument();

        // But no success/error messages (since no mutation attempted)
        expect(screen.queryByTestId("email-success")).not.toBeInTheDocument();
        expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });
});
