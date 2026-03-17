import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/store/authStore";

vi.mock("@/store/authStore", () => {
  const signUp = vi.fn();
  const waitUntilReady = vi.fn().mockResolvedValue({ user: null });

  const mockState = {
    signUp,
    waitUntilReady,
    isInitialized: true,
    session: { user: null },
    user: null,
    loading: false,
  };

  const mockedUseAuthStore = vi.fn((sel) => (sel ? sel(mockState) : mockState));

  Object.defineProperty(mockedUseAuthStore, "getState", {
    value: vi.fn(() => mockState),
  });

  return { useAuthStore: mockedUseAuthStore };
});

describe("Register page", () => {
  it("calls signUp with correct credentials on submit", async () => {
    const signUp = useAuthStore.getState().signUp;
    vi.mocked(signUp).mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    const { router } = renderWithProviders({ initialEntries: ["/register"] });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/register"),
    );

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "valid1234");
    await user.type(screen.getByLabelText("Confirm Password"), "valid1234");
    await user.click(screen.getByRole("button", { name: /Register/i }));

    expect(signUp).toHaveBeenCalledWith("test@example.com", "valid1234");
  });

  it("redirects to /login after successful registration", async () => {
    vi.mocked(useAuthStore.getState().signUp).mockResolvedValueOnce({
      error: null,
    });

    const user = userEvent.setup();
    const { router } = renderWithProviders({ initialEntries: ["/register"] });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/register"),
    );

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "pass1234");
    await user.type(screen.getByLabelText("Confirm Password"), "pass1234");
    await user.click(screen.getByRole("button", { name: /Register/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"), {
      timeout: 3000,
    });
  });

  it("shows error message when registration fails", async () => {
    vi.mocked(useAuthStore.getState().signUp).mockResolvedValueOnce({
      error: new Error("User already registered"),
    });

    const user = userEvent.setup();
    const { router } = renderWithProviders({ initialEntries: ["/register"] });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/register"),
    );

    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(screen.getByLabelText("Password"), "pass1234");
    await user.type(screen.getByLabelText("Confirm Password"), "pass1234");
    await user.click(screen.getByRole("button", { name: /Register/i }));

    await waitFor(() =>
      expect(screen.getByText(/already registered/i)).toBeInTheDocument(),
    );
  });

  it("navigates to /login when clicking Login link", async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders({ initialEntries: ["/register"] });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/register"),
    );

    await user.click(screen.getByRole("button", { name: /Login/i }));

    expect(router.state.location.pathname).toBe("/login");
  });
});
