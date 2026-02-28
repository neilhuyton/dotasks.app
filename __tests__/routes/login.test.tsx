// __tests__/routes/login.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../__mocks__/server";
import { loginHandler } from "../../__mocks__/handlers/auth";
import { TRPCError } from "@trpc/server";

import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/shared/store/authStore";
import { trpcMsw } from "../../__mocks__/trpcMsw";
import { listGetAllHandler } from "../../__mocks__/handlers/lists";

describe("LoginPage", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  beforeEach(() => {
    server.use(loginHandler, listGetAllHandler);
    useAuthStore.getState().logout();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  function renderLogin() {
    renderWithProviders({ initialEntries: ["/login"] });
  }

  async function waitForFormReady() {
    await waitFor(() => screen.getByTestId("login-form"), { timeout: 3000 });
  }

  async function fillLoginForm(email: string, password: string) {
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await userEvent.clear(emailInput);
    await userEvent.clear(passwordInput);
    await userEvent.type(emailInput, email);
    await userEvent.type(passwordInput, password);

    fireEvent.blur(emailInput);
    fireEvent.blur(passwordInput);

    await waitFor(
      () => {
        expect(emailInput).toHaveValue(email);
        expect(passwordInput).toHaveValue(password);
      },
      { timeout: 2000 },
    );
  }

  async function submitForm() {
    const form = screen.getByTestId("login-form");
    fireEvent.submit(form);
  }

  async function expectLoadingState(isLoading: boolean) {
    await waitFor(
      () => {
        const button = screen.getByRole("button", {
          name: (accessibleName) =>
            isLoading
              ? /logging in/i.test(accessibleName)
              : /^login$/i.test(accessibleName.trim()),
        });

        if (isLoading) {
          expect(button).toBeDisabled();
        } else {
          expect(button).toBeEnabled();
        }

        expect(button).toHaveTextContent(
          isLoading ? /logging in/i : /^login$/i,
        );

        const spinner = button.querySelector("svg.animate-spin");
        if (isLoading) {
          expect(spinner).toBeInTheDocument();
        } else {
          expect(spinner).not.toBeInTheDocument();
        }
      },
      { timeout: 6000 },
    );
  }

  async function expectErrorMessage(text: string | RegExp) {
    await waitFor(
      () => {
        const message = screen.getByTestId("login-message");
        expect(message).toBeInTheDocument();
        expect(message).toHaveTextContent(text);
        expect(message).toHaveClass(/text-red-500/);
      },
      { timeout: 5000 },
    );
  }

  it("renders form fields, heading, button and links", async () => {
    renderLogin();
    await waitForFormReady();

    expect(
      screen.getByRole("heading", { name: /login to your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^login$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/forgot your password\?/i)).toBeInTheDocument();
  });

  it("successful login updates auth store", async () => {
    renderLogin();
    await waitForFormReady();

    await fillLoginForm("testuser@example.com", "password123");
    await submitForm();

    await waitFor(
      () => {
        const state = useAuthStore.getState();
        expect(state.isLoggedIn).toBe(true);
        expect(state.userId).toBeTruthy();
        expect(state.accessToken).toBeTruthy();
        expect(state.refreshToken).toBeTruthy();
      },
      { timeout: 8000 },
    );
  });

  it("invalid credentials shows error message & keeps user logged out", async () => {
    server.use(
      trpcMsw.login.mutation(async () => {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }),
    );

    renderLogin();
    await waitForFormReady();

    await fillLoginForm("wrong@example.com", "wrongpass");
    await submitForm();

    await expectErrorMessage(/invalid email or password/i);

    await waitFor(
      () => expect(useAuthStore.getState().isLoggedIn).toBe(false),
      { timeout: 5000 },
    );
  });

  it("shows loading state during submission (failed case)", async () => {
    server.use(
      trpcMsw.login.mutation(async () => {
        await new Promise((r) => setTimeout(r, 600));
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }),
    );

    renderLogin();
    await waitForFormReady();

    await fillLoginForm("test@example.com", "password123");

    const submissionPromise = submitForm();

    await expectLoadingState(true);

    await submissionPromise;

    await expectLoadingState(false);
    await expectErrorMessage(/invalid/i);
  });

  it("shows client-side validation errors for invalid input", async () => {
    renderLogin();
    await waitForFormReady();

    await fillLoginForm("invalid-email", "short");

    await submitForm();

    await waitFor(
      () => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });

  it("submit button is disabled when form is invalid", async () => {
    renderLogin();
    await waitForFormReady();

    const button = screen.getByRole("button", { name: /^login$/i });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/email/i), "valid@example.com");
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/password/i), "veryweak");
    expect(button).not.toBeDisabled();
  });
});
