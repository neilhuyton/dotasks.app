// __tests__/pages/register.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";

import { registerHandler } from "../../__mocks__/handlers/register";
import { router } from "../../src/router";

import {
  renderWithTrpcRouter,
  expectSuccessMessage,
  expectErrorMessage,
} from "../utils/test-helpers";
import { suppressActWarnings } from "../act-suppress";

suppressActWarnings();

function renderRegister() {
  renderWithTrpcRouter({
    initialPath: "/register",
    routeTree: router.routeTree,
  });
}

const waitForFormReady = async (timeout = 2000) =>
  waitFor(() => screen.getByTestId("email-input"), { timeout });

const fillRegistrationForm = async (email: string, password: string) => {
  const emailInput = screen.getByTestId("email-input");
  const passwordInput = screen.getByTestId("password-input");
  const confirmInput = screen.getByTestId("confirm-password-input");

  await userEvent.clear(emailInput);
  await userEvent.clear(passwordInput);
  await userEvent.clear(confirmInput);

  await userEvent.type(emailInput, email);
  await userEvent.type(passwordInput, password);
  await userEvent.type(confirmInput, password); // ← only change here
};

const submitForm = () => {
  const button = screen.getByTestId("register-button");
  fireEvent.click(button); // ← only change here (from dispatchEvent)
};

describe("RegisterPage", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    server.use(registerHandler);
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders form fields, register button and login link", async () => {
    renderRegister();
    await waitForFormReady();

    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("register-button")).toBeInTheDocument();
    expect(screen.getByTestId("login-link")).toBeInTheDocument();
  });

  it("submits valid registration → shows success message", async () => {
    renderRegister();
    await waitForFormReady();

    await fillRegistrationForm("newuser@example.com", "StrongPass123!");
    submitForm();

    await expectSuccessMessage(
      "register-message",
      /Registration successful/i,
      "text-green-500",
      8000,
    );

    const messageEl = screen.getByTestId("register-message");
    expect(messageEl).toHaveTextContent(/check your email to verify/i);
  });

  it("shows loading state during registration", async () => {
    renderRegister();
    await waitForFormReady();

    await fillRegistrationForm("test@example.com", "password123");
    submitForm();

    await waitFor(
      () => {
        const btn = screen.getByTestId("register-button");
        expect(btn).toBeDisabled();
        expect(btn).toHaveTextContent("Registering...");
        expect(screen.getByTestId("register-loading")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("disables button during registration", async () => {
    renderRegister();
    await waitForFormReady();

    const button = screen.getByTestId("register-button");
    expect(button).not.toBeDisabled();

    await fillRegistrationForm("test@example.com", "password123");
    submitForm();

    await waitFor(
      () => {
        expect(screen.getByTestId("register-button")).toHaveTextContent(
          "Registering...",
        );
        expect(screen.getByTestId("register-button")).toBeDisabled();
      },
      { timeout: 5000 },
    );
  });

  it("shows error when trying to register with already used email", async () => {
    renderRegister();
    await waitForFormReady(2500);

    await fillRegistrationForm("duplicate@example.com", "password123");
    submitForm();
    await expectSuccessMessage(
      "register-message",
      /Registration successful/i,
      "text-green-500",
      8000,
    );

    await new Promise((r) => setTimeout(r, 150));

    await fillRegistrationForm("duplicate@example.com", "password123");
    submitForm();

    await expectErrorMessage(
      "register-message",
      "Email already exists",
      "text-red-500",
      8000,
    );
  }, 20000);

  it.todo(
    "shows client-side validation errors for invalid email or weak password",
  );
});