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
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "../../../__mocks__/server";
import {
  getCurrentUserHandler,
  updateEmailHandler,
  updateEmailSuccessHandler,
  sendPasswordResetHandler,
} from "../../../__mocks__/handlers/profile";
import { listGetAllHandler } from "../../../__mocks__/handlers/lists";

import { renderWithProviders } from "../../utils/test-helpers";
import { useAuthStore } from "@/shared/store/authStore";
import { suppressActWarnings } from "../../act-suppress";

suppressActWarnings();

describe("Profile Page (/_authenticated/profile)", () => {
  const TEST_USER_ID = "test-user-123";
  const INITIAL_EMAIL = "testuser@example.com";

  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

  beforeEach(() => {
    server.resetHandlers();
    server.use(getCurrentUserHandler, listGetAllHandler, updateEmailHandler);

    useAuthStore.setState({
      isLoggedIn: true,
      userId: TEST_USER_ID,
      user: { id: TEST_USER_ID, email: INITIAL_EMAIL },
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.getState().logout?.();
  });

  afterAll(() => server.close());

  function renderProfile() {
    return renderWithProviders({
      initialEntries: ["/profile"],
    });
  }

  async function waitForProfileReady() {
    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: /profile/i, level: 1 }),
        ).toBeInTheDocument();
        expect(screen.getByTestId("current-email")).toBeInTheDocument();
        expect(screen.getByTestId("current-email")).toHaveTextContent(
          INITIAL_EMAIL,
        );
        expect(
          screen.queryByText(/failed to load profile/i),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/loading profile information/i),
        ).not.toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  }

  it("renders profile title and current email", async () => {
    renderProfile();
    await waitForProfileReady();
    expect(screen.getByTestId("current-email")).toHaveTextContent(
      INITIAL_EMAIL,
    );
  });

  it("successfully updates email → shows success banner", async () => {
    server.use(updateEmailSuccessHandler);
    renderProfile();
    await waitForProfileReady();

    await userEvent.clear(screen.getByTestId("email-input"));
    await userEvent.type(
      screen.getByTestId("email-input"),
      "new.email@example.com",
    );

    fireEvent.submit(screen.getByTestId("email-form"));

    await waitFor(
      () => {
        expect(screen.getByTestId("banner-message")).toBeInTheDocument();
        expect(screen.getByTestId("banner-message")).toHaveTextContent(
          /successfully|updated/i,
        );
      },
      { timeout: 1500 },
    );
  });

  it("shows error banner when email is already taken", async () => {
    server.use(updateEmailHandler);
    renderProfile();
    await waitForProfileReady();

    await userEvent.clear(screen.getByTestId("email-input"));
    await userEvent.type(
      screen.getByTestId("email-input"),
      "already.taken@example.com",
    );

    fireEvent.submit(screen.getByTestId("email-form"));

    await waitFor(
      () => {
        expect(screen.getByTestId("banner-message")).toBeInTheDocument();
        expect(screen.getByTestId("banner-message")).toHaveTextContent(
          /Failed to update email|Please try again/i,
        );
      },
      { timeout: 1500 },
    );
  });

  it("sends password reset link → shows success banner", async () => {
    server.use(sendPasswordResetHandler);
    renderProfile();
    await waitForProfileReady();

    await userEvent.clear(screen.getByTestId("password-input"));
    await userEvent.type(screen.getByTestId("password-input"), INITIAL_EMAIL);

    fireEvent.submit(screen.getByTestId("password-form"));

    await waitFor(
      () => {
        expect(screen.getByTestId("banner-message")).toBeInTheDocument();
        expect(screen.getByTestId("banner-message")).toHaveTextContent(
          /sent|reset link/i,
        );
      },
      { timeout: 1500 },
    );
  });

  it("shows loading state on email form during submission", async () => {
    server.use(
      http.post("/trpc/user.updateEmail", async () => {
        await new Promise((r) => setTimeout(r, 800));
        return HttpResponse.json({ success: true });
      }),
    );

    renderProfile();
    await waitForProfileReady();

    await userEvent.clear(screen.getByTestId("email-input"));
    await userEvent.type(
      screen.getByTestId("email-input"),
      "delay@example.com",
    );

    const submitPromise = fireEvent.submit(screen.getByTestId("email-form"));

    await waitFor(
      () => {
        const btn = screen.getByTestId("email-submit");
        expect(btn).toBeDisabled();
        expect(btn).toHaveTextContent(/updating/i);
      },
      { timeout: 1500 },
    );

    await submitPromise;

    await waitFor(
      () => {
        const btn = screen.getByTestId("email-submit");
        expect(btn).not.toBeDisabled();
      },
      { timeout: 2000 },
    );
  });

  it("shows client-side validation error for invalid email", async () => {
    renderProfile();
    await waitForProfileReady();

    await userEvent.clear(screen.getByTestId("email-input"));
    await userEvent.type(screen.getByTestId("email-input"), "invalid");

    fireEvent.submit(screen.getByTestId("email-form"));

    await waitFor(
      () => {
        expect(
          screen.getByText(/valid email|invalid email/i),
        ).toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });

  it("logs out and navigates to /login after confirming dialog", async () => {
    const { router } = renderProfile();
    await waitForProfileReady();

    const navigateSpy = vi.spyOn(router, "navigate");

    await userEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /Are you sure you want to log out/i,
        }),
      ).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /Logout/i });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/login", replace: true }),
      );
    });

    expect(useAuthStore.getState().isLoggedIn).toBe(false);

    navigateSpy.mockRestore();
  });

  describe("Close button navigation", () => {
    it("navigates back using history.back() when there is previous history", async () => {
      const { router } = renderProfile();
      await waitForProfileReady();

      const canGoBackSpy = vi
        .spyOn(router.history, "canGoBack")
        .mockReturnValue(true);
      const backSpy = vi.spyOn(router.history, "back");

      const navigateSpy = vi.spyOn(router, "navigate");

      await userEvent.click(screen.getByTestId("close-profile"));

      expect(canGoBackSpy).toHaveBeenCalledTimes(1);
      expect(backSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).not.toHaveBeenCalled();

      canGoBackSpy.mockRestore();
      backSpy.mockRestore();
      navigateSpy.mockRestore();
    });

    it("falls back to /lists when there is no previous history", async () => {
      const { router } = renderProfile();
      await waitForProfileReady();

      const canGoBackSpy = vi
        .spyOn(router.history, "canGoBack")
        .mockReturnValue(false);
      const backSpy = vi.spyOn(router.history, "back");
      const navigateSpy = vi.spyOn(router, "navigate");

      await userEvent.click(screen.getByTestId("close-profile"));

      expect(canGoBackSpy).toHaveBeenCalledTimes(1);
      expect(backSpy).not.toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/lists",
          replace: true,
        }),
      );

      canGoBackSpy.mockRestore();
      backSpy.mockRestore();
      navigateSpy.mockRestore();
    });

    it("falls back to /lists when canGoBack throws or is unavailable (defensive)", async () => {
      const { router } = renderProfile();
      await waitForProfileReady();

      const canGoBackSpy = vi
        .spyOn(router.history, "canGoBack")
        .mockImplementation(() => {
          throw new Error("canGoBack unavailable");
        });

      const navigateSpy = vi.spyOn(router, "navigate");

      await userEvent.click(screen.getByTestId("close-profile"));

      expect(canGoBackSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/lists",
          replace: true,
        }),
      );

      canGoBackSpy.mockRestore();
      navigateSpy.mockRestore();
    });
  });
});
