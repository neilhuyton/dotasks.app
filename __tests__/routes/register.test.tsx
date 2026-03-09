// __tests__/routes/register.test.tsx

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../__tests__/act-suppress";

suppressActWarnings();

vi.mock("@/store/authStore", () => {
  const mockSession = { user: null };

  const signUp = vi.fn();
  const waitUntilReady = vi.fn().mockResolvedValue(mockSession);

  const mockState = {
    signUp,
    waitUntilReady,
  };

  const mockedUseAuthStore = vi.fn(
    (selector?: (state: typeof mockState) => unknown) =>
      selector ? selector(mockState) : mockState,
  );

  Object.defineProperty(mockedUseAuthStore, "getState", {
    value: vi.fn(() => mockState),
    writable: true,
    configurable: true,
  });

  return {
    useAuthStore: mockedUseAuthStore,
  };
});

describe("Register Page (/register)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderRegisterPage() {
    return renderWithProviders({ initialEntries: ["/register"] });
  }

  it("renders the form, logo, and heading", async () => {
    renderRegisterPage();

    await waitFor(() => {
      expect(screen.getByText("Create an account")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Enter your details below to create an account/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Register/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });

  it("disables submit until form is valid", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const emailInput = await screen.findByLabelText("Email");
    const pwdInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const submit = screen.getByRole("button", { name: /Register/i });

    expect(submit).toBeDisabled();

    await user.type(emailInput, "test@example.com");
    expect(submit).toBeDisabled();

    await user.type(pwdInput, "short");
    expect(submit).toBeDisabled();

    await user.clear(pwdInput);
    await user.type(pwdInput, "longenough123");
    expect(submit).toBeDisabled();

    await user.type(confirmInput, "wrong");
    expect(submit).toBeDisabled();

    await user.clear(confirmInput);
    await user.type(confirmInput, "longenough123");

    await waitFor(() => {
      expect(submit).not.toBeDisabled();
    });
  });

  it("shows validation messages for invalid/short/mismatched passwords", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const pwdInput = await screen.findByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");

    await user.type(pwdInput, "short");
    await user.tab();
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });

    await user.clear(pwdInput);
    await user.type(pwdInput, "longenough123");
    await user.type(confirmInput, "different");
    await user.tab();
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
  });

  it("shows success message and redirects after successful registration", async () => {
    const signUp = useAuthStore.getState().signUp;
    vi.mocked(signUp).mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    const { router } = renderRegisterPage();

    const emailInput = await screen.findByLabelText("Email");
    const pwdInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const submit = screen.getByRole("button", { name: /Register/i });

    await user.type(emailInput, "newuser@example.com");
    await user.type(pwdInput, "strongpass123");
    await user.type(confirmInput, "strongpass123");
    await user.click(submit);

    await screen.findByText(/Account created!/i);
    await screen.findByText(/check your email/i);

    const start = Date.now();
    while (Date.now() - start < 4500) {
      if (router.state.location.pathname === "/login") {
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(router.state.location.pathname).toBe("/login");
    expect(vi.mocked(signUp)).toHaveBeenCalledWith(
      "newuser@example.com",
      "strongpass123",
    );
  });

  it("shows specific error messages for common failures", async () => {
    const signUp = useAuthStore.getState().signUp;

    const user = userEvent.setup();
    renderRegisterPage();

    const emailInput = await screen.findByLabelText("Email");
    const pwdInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const submit = screen.getByRole("button", { name: /Register/i });

    vi.mocked(signUp).mockResolvedValueOnce({
      error: new Error("User already registered"),
    });

    await user.type(emailInput, "existing@example.com");
    await user.type(pwdInput, "strongpass123");
    await user.type(confirmInput, "strongpass123");
    await user.click(submit);

    await waitFor(() => {
      expect(
        screen.getByText(/This email is already registered/i),
      ).toBeInTheDocument();
    });

    vi.mocked(signUp).mockResolvedValueOnce({
      error: new Error("Password is too weak"),
    });

    await user.clear(emailInput);
    await user.type(emailInput, "new@example.com");
    await user.clear(pwdInput);
    await user.type(pwdInput, "longenough123");
    await user.clear(confirmInput);
    await user.type(confirmInput, "longenough123");
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByText(/Password is too weak/i)).toBeInTheDocument();
    });

    vi.mocked(signUp).mockResolvedValueOnce({
      error: new Error("Network error"),
    });

    await user.clear(emailInput);
    await user.type(emailInput, "another@example.com");
    await user.click(submit);

    await waitFor(() => {
      expect(
        screen.getByText(/Registration failed: Network error/i),
      ).toBeInTheDocument();
    });
  });

  it("shows loading state during registration", async () => {
    const signUp = useAuthStore.getState().signUp;

    vi.mocked(signUp).mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return { error: null };
    });

    const user = userEvent.setup();
    renderRegisterPage();

    const emailInput = await screen.findByLabelText("Email");
    const pwdInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const submit = screen.getByRole("button", { name: /Register/i });

    await user.type(emailInput, "test@example.com");
    await user.type(pwdInput, "strongpass123");
    await user.type(confirmInput, "strongpass123");
    await user.click(submit);

    await waitFor(() => {
      expect(submit).toHaveTextContent("Registering...");
      expect(submit).toBeDisabled();
    });
  });

  it('navigates to login when "Login" link is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderRegisterPage();

    const loginLink = await screen.findByRole("button", { name: /Login/i });

    await user.click(loginLink);

    expect(router.state.location.pathname).toBe("/login");
  });
});
