// __tests__/routes/register.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../__mocks__/server";
import { registerHandler } from "../../__mocks__/handlers/register";

import { renderWithProviders } from "../utils/test-helpers";

describe("RegisterPage", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  beforeEach(() => {
    server.use(registerHandler);
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  function renderRegister() {
    renderWithProviders( { initialEntries: ["/register"] });
  }

  async function waitForFormReady() {
    await waitFor(() => screen.getByLabelText(/email/i), { timeout: 2000 });
  }

  async function fillRegistrationForm(email: string, password: string) {
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    await userEvent.clear(emailInput);
    await userEvent.clear(passwordInput);
    await userEvent.clear(confirmInput);

    await userEvent.type(emailInput, email);
    await userEvent.type(passwordInput, password);
    await userEvent.type(confirmInput, password);
  }

  function submitForm() {
    const form = screen.getByTestId("register-form");
    fireEvent.submit(form);
  }

  it("renders form fields, register button and login link", async () => {
    renderRegister();
    await waitForFormReady();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /register/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("submits valid registration → shows success message", async () => {
    renderRegister();
    await waitForFormReady();

    await fillRegistrationForm("newuser@example.com", "StrongPass123!");
    submitForm();

    await waitFor(() => {
      const message = screen.getByText(/registration successful/i);
      expect(message).toBeInTheDocument();
      expect(message).toHaveClass(/text-green-500/);
    });

    await waitFor(() =>
      expect(
        screen.getByText(/check your email to verify/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows loading state during registration", async () => {
    renderRegister();
    await waitForFormReady();

    await fillRegistrationForm("test@example.com", "password123");
    submitForm();

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /registering/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent(/registering/i);
      expect(btn.querySelector("svg.animate-spin")).toBeInTheDocument();
    });
  });

  it("disables button when form is invalid and during submission", async () => {
    renderRegister();
    await waitForFormReady();

    const button = screen.getByRole("button", { name: /register/i });
    expect(button).toBeDisabled();

    await fillRegistrationForm("test@example.com", "password123");
    submitForm();

    await waitFor(() => {
      const submittingBtn = screen.getByRole("button", {
        name: /registering/i,
      });
      expect(submittingBtn).toBeDisabled();
      expect(submittingBtn).toHaveTextContent(/registering/i);
    });
  });

  it("shows error when trying to register with already used email", async () => {
    renderRegister();
    await waitForFormReady();

    // First registration (should succeed)
    await fillRegistrationForm("duplicate@example.com", "password123");
    submitForm();

    await waitFor(() =>
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument(),
    );

    // Second attempt with same email (should fail)
    await fillRegistrationForm("duplicate@example.com", "password123");
    submitForm();

    await waitFor(() => {
      const error = screen.getByText(/email already exists/i);
      expect(error).toBeInTheDocument();
      expect(error).toHaveClass(/text-red-500/);
    });
  }, 15000);

  // Uncomment & implement when ready
  // it("shows client-side validation errors for invalid email or weak password", async () => {
  //   // ...
  // });
});
