// __tests__/routes/_authenticated/profile.test.tsx

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";

vi.mock("../../../server/email", () => ({
  sendResetPasswordEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEmailChangeNotification: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordChangeNotification: vi.fn().mockResolvedValue({ success: true }),
  sendMailWithDebug: vi.fn().mockResolvedValue({ success: true }),
}));

import { server } from "../../../__mocks__/server";
import {
  userCreateOrSyncHandler,
  supabaseUpdateEmailSuccess,
  supabaseUpdateEmailTaken,
  supabaseUpdateEmailDelayed,
  sendPasswordResetHandler,
} from "../../../__mocks__/handlers/profile";
import { listGetAllHandler } from "../../../__mocks__/handlers/lists";

import { renderWithProviders } from "../../utils/test-helpers";
import { useAuthStore } from "@/shared/store/authStore";
import { suppressActWarnings } from "../../act-suppress";
import userEvent from "@testing-library/user-event";

suppressActWarnings();

describe("Profile Page (/_authenticated/profile)", () => {
  const INITIAL_EMAIL = "testuser@example.com";

  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

  beforeEach(async () => {
    server.resetHandlers();
    server.use(userCreateOrSyncHandler, listGetAllHandler);

    useAuthStore.setState({
      session: null,
      user: null,
      loading: true,
      error: null,
    });

    await useAuthStore.getState().initialize();

    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });

  afterAll(() => server.close());

  function renderProfile() {
    return renderWithProviders({ initialEntries: ["/profile"] });
  }

  async function waitForProfileReady() {
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
        expect(screen.getByTestId("current-email")).toHaveTextContent(INITIAL_EMAIL);
      },
      { timeout: 1500 },
    );
  }

  it("renders profile title and current email", async () => {
    renderProfile();
    await waitForProfileReady();
  });

  it("successfully requests email change → shows success banner", async () => {
    server.use(supabaseUpdateEmailSuccess);
    renderProfile();
    await waitForProfileReady();

    const input = screen.getByTestId("email-input");
    await userEvent.clear(input);
    await userEvent.type(input, "new.email@example.com");

    await userEvent.click(screen.getByTestId("email-submit"));

    await waitFor(
      () => {
        expect(screen.getByTestId("banner-message")).toBeInTheDocument();
        expect(screen.getByTestId("banner-message")).toHaveTextContent(
          /Confirmation emails sent to both addresses\. Check inboxes/i
        );
      },
      { timeout: 2000 },
    );
  });

  it("shows error banner when email change fails (already taken)", async () => {
    server.use(supabaseUpdateEmailTaken);
    renderProfile();
    await waitForProfileReady();

    const input = screen.getByTestId("email-input");
    await userEvent.clear(input);
    await userEvent.type(input, "already.taken@example.com");

    await userEvent.click(screen.getByTestId("email-submit"));

    await waitFor(
      () => {
        expect(screen.getByTestId("banner-message")).toBeInTheDocument();
        expect(screen.getByTestId("banner-message")).toHaveTextContent(/Failed to change email/i);
      },
      { timeout: 2000 },
    );
  });

  it("shows loading state during email change request", async () => {
    server.use(supabaseUpdateEmailDelayed);
    renderProfile();
    await waitForProfileReady();

    const input = screen.getByTestId("email-input");
    const submit = screen.getByTestId("email-submit");

    await userEvent.clear(input);
    await userEvent.type(input, "delay@example.com");

    await userEvent.click(submit);

    await waitFor(
      () => {
        expect(submit).toBeDisabled();
        expect(submit).toHaveTextContent(/Requesting change.../i);
      },
      { timeout: 1500 },
    );

    await waitFor(
      () => {
        expect(submit).toHaveTextContent(/Change Email/i);
        expect(submit).toBeDisabled();
      },
      { timeout: 2500 },
    );
  });

  it("sends password reset link → shows success banner", async () => {
    server.use(sendPasswordResetHandler);
    renderProfile();
    await waitForProfileReady();

    const input = screen.getByTestId("password-input");
    await userEvent.clear(input);
    await userEvent.type(input, INITIAL_EMAIL);

    await userEvent.click(screen.getByTestId("reset-submit"));

    await waitFor(
      () => {
        expect(screen.getByTestId("banner-message")).toBeInTheDocument();
        expect(screen.getByTestId("banner-message")).toHaveTextContent(/Password reset link sent/i);
      },
      { timeout: 2000 },
    );
  });

  it("shows client-side validation error for invalid email", async () => {
    renderProfile();
    await waitForProfileReady();

    const input = screen.getByTestId("email-input");
    await userEvent.clear(input);
    await userEvent.type(input, "invalid");

    await userEvent.click(screen.getByTestId("email-submit"));

    await waitFor(
      () => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it.skip("logs out and navigates to /login after confirming dialog", async () => {
    renderProfile();
    await waitForProfileReady();

    // Mock window.location.replace safely
    const locationReplaceMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        replace: locationReplaceMock,
      },
      writable: true,
    });

    await userEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Are you sure you want to log out/i }),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Logout/i }));

    await waitFor(() => {
      expect(locationReplaceMock).toHaveBeenCalledWith("/login");
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.loading).toBe(false);
  });

  describe("Close button navigation", () => {
    it("navigates back using history.back() when there is previous history", async () => {
      const { router } = renderProfile();
      await waitForProfileReady();

      const canGoBackSpy = vi.spyOn(router.history, "canGoBack").mockReturnValue(true);
      const backSpy = vi.spyOn(router.history, "back");

      await userEvent.click(screen.getByTestId("close-profile"));

      expect(canGoBackSpy).toHaveBeenCalledTimes(1);
      expect(backSpy).toHaveBeenCalledTimes(1);

      canGoBackSpy.mockRestore();
      backSpy.mockRestore();
    });

    it("falls back to /lists when there is no previous history", async () => {
      const { router } = renderProfile();
      await waitForProfileReady();

      const canGoBackSpy = vi.spyOn(router.history, "canGoBack").mockReturnValue(false);
      const navigateSpy = vi.spyOn(router, "navigate");

      await userEvent.click(screen.getByTestId("close-profile"));

      expect(canGoBackSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/lists", replace: true })
      );

      canGoBackSpy.mockRestore();
      navigateSpy.mockRestore();
    });

    it("falls back to /lists when canGoBack throws or is unavailable (defensive)", async () => {
      const { router } = renderProfile();
      await waitForProfileReady();

      vi.spyOn(router.history, "canGoBack").mockImplementation(() => {
        throw new Error("canGoBack unavailable");
      });

      const navigateSpy = vi.spyOn(router, "navigate");

      await userEvent.click(screen.getByTestId("close-profile"));

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/lists", replace: true })
      );

      navigateSpy.mockRestore();
    });
  });
});