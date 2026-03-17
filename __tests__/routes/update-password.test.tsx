import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/store/authStore";

vi.mock("@/store/authStore", () => {
  const updateUserPassword = vi.fn();
  const waitUntilReady = vi.fn().mockResolvedValue({ user: null });

  const mockState = {
    updateUserPassword,
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

describe("Update Password Page (/update-password)", () => {
  it("calls updateUserPassword with new password on submit", async () => {
    const updateUserPassword = useAuthStore.getState().updateUserPassword;
    vi.mocked(updateUserPassword).mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    const { router } = renderWithProviders({
      initialEntries: ["/update-password"],
    });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/update-password"),
    );

    const newPasswordInput = await screen.findByLabelText("New Password");
    const confirmInput = await screen.findByLabelText("Confirm Password");
    const submitButton = await screen.findByRole("button", {
      name: /Update Password/i,
    });

    await user.type(newPasswordInput, "newsecurepass2025");
    await user.type(confirmInput, "newsecurepass2025");
    await user.click(submitButton);

    expect(updateUserPassword).toHaveBeenCalledWith("newsecurepass2025");
  });

  it("redirects to /login after successful update", async () => {
    vi.mocked(useAuthStore.getState().updateUserPassword).mockResolvedValueOnce(
      { error: null },
    );

    const user = userEvent.setup();
    const { router } = renderWithProviders({
      initialEntries: ["/update-password"],
    });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/update-password"),
    );

    await user.type(await screen.findByLabelText("New Password"), "pass123456");
    await user.type(
      await screen.findByLabelText("Confirm Password"),
      "pass123456",
    );
    await user.click(
      await screen.findByRole("button", { name: /Update Password/i }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"), {
      timeout: 3000,
    });
  });

  it("passes isLoading=true to form during update", async () => {
    vi.mocked(
      useAuthStore.getState().updateUserPassword,
    ).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 150),
        ),
    );

    const user = userEvent.setup();
    const { router } = renderWithProviders({
      initialEntries: ["/update-password"],
    });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/update-password"),
    );

    await user.type(
      await screen.findByLabelText("New Password"),
      "validpass789",
    );
    await user.type(
      await screen.findByLabelText("Confirm Password"),
      "validpass789",
    );
    await user.click(
      await screen.findByRole("button", { name: /Update Password/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Updating.../i }),
      ).toBeInTheDocument(),
    );
  });

  it("shows error message when update fails", async () => {
    vi.mocked(useAuthStore.getState().updateUserPassword).mockResolvedValueOnce(
      {
        error: new Error("Current password is incorrect"),
      },
    );

    const user = userEvent.setup();
    const { router } = renderWithProviders({
      initialEntries: ["/update-password"],
    });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/update-password"),
    );

    await user.type(await screen.findByLabelText("New Password"), "newpass123");
    await user.type(
      await screen.findByLabelText("Confirm Password"),
      "newpass123",
    );
    await user.click(
      await screen.findByRole("button", { name: /Update Password/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Error: Current password is incorrect/i),
      ).toBeInTheDocument(),
    );
  });

  it("navigates to /login when clicking 'Back to login'", async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders({
      initialEntries: ["/update-password"],
    });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/update-password"),
    );

    await user.click(
      await screen.findByRole("button", { name: /Back to login/i }),
    );

    expect(router.state.location.pathname).toBe("/login");
  });
});
