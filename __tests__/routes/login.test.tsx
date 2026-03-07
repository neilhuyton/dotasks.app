// __tests__/routes/login.test.tsx

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/shared/store/authStore";

vi.mock("@/shared/store/authStore", () => {
  const mockSession = { user: null };

  const signIn = vi.fn();
  const waitUntilReady = vi.fn().mockResolvedValue(mockSession);

  const mockState = {
    signIn,
    waitUntilReady,
    isInitialized: true,
    session: mockSession,
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

describe("Login Page (/login)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLoginPage = () =>
    renderWithProviders({ initialEntries: ["/login"] });

  it("renders the form, heading, and links", async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByText("Login to your account")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Enter your email below to login to your account/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Forgot your password?/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign up/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Resend verification email/i }),
    ).toBeInTheDocument();
  });

  it("disables submit until valid credentials", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const email = await screen.findByLabelText("Email");
    const password = screen.getByLabelText("Password");
    const submit = screen.getByRole("button", { name: /Login/i });

    expect(submit).toBeDisabled();

    await user.type(email, "test@example.com");
    await user.type(password, "longenough123");

    await waitFor(() => expect(submit).not.toBeDisabled());
  });

  it("shows validation messages for invalid email/short password", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const email = await screen.findByLabelText("Email");
    const password = screen.getByLabelText("Password");

    await user.type(email, "not-email");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });

    await user.clear(email);
    await user.type(email, "test@example.com");

    await user.type(password, "short");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it("shows specific error messages for common login failures", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const email = await screen.findByLabelText("Email");
    const password = screen.getByLabelText("Password");
    const submit = screen.getByRole("button", { name: /Login/i });

    const signIn = useAuthStore.getState().signIn;
    vi.mocked(signIn).mockResolvedValueOnce({
      error: new Error("Invalid login credentials"),
    });

    await user.type(email, "wrong@example.com");
    await user.type(password, "wrongpass");
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByTestId("login-message")).toHaveTextContent(
        "Invalid email or password",
      );
    });

    vi.mocked(signIn).mockResolvedValueOnce({
      error: new Error("Email not confirmed"),
    });

    await user.clear(email);
    await user.type(email, "unverified@example.com");
    await user.type(password, "strongpass123");
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByTestId("login-message")).toHaveTextContent(
        /verify your email/i,
      );
    });
  });

  it("shows loading state during login", async () => {
    const signIn = useAuthStore.getState().signIn;

    vi.mocked(signIn).mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return { error: null };
    });

    const user = userEvent.setup();
    renderLoginPage();

    const email = await screen.findByLabelText("Email");
    const password = screen.getByLabelText("Password");
    const submit = screen.getByRole("button", { name: /Login/i });

    await user.type(email, "test@example.com");
    await user.type(password, "strongpass123");
    await user.click(submit);

    await waitFor(() => {
      expect(submit).toHaveTextContent("Logging in...");
      expect(submit).toBeDisabled();
    });
  });

  it('navigates to reset-password when "Forgot your password?" is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderLoginPage();

    const forgot = await screen.findByRole("button", {
      name: /Forgot your password?/i,
    });
    await user.click(forgot);

    expect(router.state.location.pathname).toBe("/reset-password");
  });

  it('navigates to register when "Sign up" is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderLoginPage();

    const signup = await screen.findByRole("button", { name: /Sign up/i });
    await user.click(signup);

    expect(router.state.location.pathname).toBe("/register");
  });

  it("navigates to resend-verification with email when clicked", async () => {
    const user = userEvent.setup();
    const { router } = renderLoginPage();

    const emailInput = await screen.findByLabelText("Email");
    await user.type(emailInput, "test@example.com");

    const resend = await screen.findByRole("button", {
      name: /Resend verification email/i,
    });
    await user.click(resend);

    expect(router.state.location.pathname).toBe("/resend-verification");
    expect(router.state.location.search).toEqual({ email: "test@example.com" });
  });
});
