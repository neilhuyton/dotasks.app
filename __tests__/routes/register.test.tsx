// __tests__/routes/register.test.tsx

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { Route } from "@/app/routes/register";
import { server } from "../../__mocks__/server";
import { registerHandler } from "../../__mocks__/handlers/register"; // assuming this exists

import { renderWithProviders } from "../utils/test-helpers";

vi.mock("../../../server/email");

vi.mock("@/trpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/trpc")>();
  return {
    ...actual,
    trpcClient: {
      ...actual.trpcClient,
      user: {
        ...actual.trpcClient?.user,
        createOrSync: {
          ...actual.trpcClient?.user?.createOrSync,
          mutate: vi.fn().mockResolvedValue({
            success: true,
            message: "Mocked user sync",
          }),
        },
      },
    },
  };
});

describe("RegisterPage", () => {
  let signupAttempts = 0;

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

  beforeEach(() => {
    server.resetHandlers();
    server.use(registerHandler);
    signupAttempts = 0;

    server.use(
      http.post("*/auth/v1/signup", async ({ request }) => {
        signupAttempts++;
        const body = (await request.json()) as { email: string };

        if (signupAttempts >= 2 && body.email === "duplicate@example.com") {
          return HttpResponse.json(
            { msg: "User already registered" },
            { status: 400 }
          );
        }

        return HttpResponse.json(
          {
            id: "00000000-0000-0000-0000-000000000001",
            email: body.email,
            aud: "authenticated",
            role: "authenticated",
          },
          { status: 200 }
        );
      })
    );

    vi.clearAllMocks();
    vi.spyOn(Route, "useNavigate").mockReturnValue(vi.fn());
  });

  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });

  afterAll(() => server.close());

  function renderRegister() {
    renderWithProviders({ initialEntries: ["/register"] });
  }

  async function waitForFormReady() {
    await waitFor(() => screen.getByLabelText(/email/i), { timeout: 3000 });
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

  async function submitForm() {
    const submitBtn = await screen.findByRole("button", { name: /register/i });
    await userEvent.click(submitBtn);
  }

  it("renders form fields, register button and login link", async () => {
    renderRegister();
    await waitForFormReady();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("shows loading state during registration", async () => {
    renderRegister();
    await waitForFormReady();

    await fillRegistrationForm("test@example.com", "StrongPass123!");
    await submitForm();

    await waitFor(
      () => {
        const btn = screen.getByRole("button", { name: /registering/i });
        expect(btn).toBeDisabled();
        expect(btn).toHaveTextContent(/registering/i);
        expect(btn.querySelector(".animate-spin")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("disables button when form is invalid and during submission", async () => {
    renderRegister();
    await waitForFormReady();

    const button = screen.getByRole("button", { name: /register/i });
    expect(button).toBeDisabled();

    await fillRegistrationForm("test@example.com", "StrongPass123!");
    expect(button).not.toBeDisabled();

    await submitForm();

    await waitFor(
      () => {
        const submittingBtn = screen.getByRole("button", { name: /registering/i });
        expect(submittingBtn).toBeDisabled();
      },
      { timeout: 3000 }
    );
  });

  it("shows success message after valid registration", async () => {
    renderRegister();
    await waitForFormReady();

    await fillRegistrationForm("newuser@example.com", "StrongPass123!");
    await submitForm();

    await waitFor(
      () => {
        expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it.skip("shows error message when registering with duplicate email", async () => {
    renderRegister();
    await waitForFormReady();

    // First attempt - should succeed
    await fillRegistrationForm("duplicate@example.com", "StrongPass123!");
    await submitForm();

    await waitFor(
      () => {
        expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Second attempt - same email → should fail
    await fillRegistrationForm("duplicate@example.com", "StrongPass123!");
    await submitForm();

    await waitFor(
      () => {
        expect(screen.getByText(/already registered/i)).toBeInTheDocument();
      },
      { timeout: 6000 }
    );
  }, 15000);
});