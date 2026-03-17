import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useAuthStore } from "@/store/authStore";
import { renderWithProviders } from "../../../__tests__/utils/test-helpers";
import type { User, Session } from "@supabase/supabase-js";
import { APP_CONFIG } from "@/appConfig";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock("@/trpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/trpc")>();

  return {
    ...actual,
    useTRPC: vi.fn(() => ({
      user: {
        getCurrent: {
          queryKey: () => ["user", "current"],
        },
      },
    })),
  };
});

describe("ProfilePage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: {
        id: "test-user",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
      } as User,
      session: {
        access_token: "mock-token",
        refresh_token: "mock-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "test-user",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          role: "authenticated",
          created_at: new Date().toISOString(),
        } as User,
      } as Session,
      loading: false,
      error: null,
      isInitialized: true,
    });
  });

  it("renders the close button", async () => {
    await act(async () => {
      renderWithProviders({ initialEntries: ["/profile"] });
    });

    expect(screen.getByTestId("close-profile")).toBeInTheDocument();
  });

  it("shows the back arrow icon inside the close button", async () => {
    await act(async () => {
      renderWithProviders({ initialEntries: ["/profile"] });
    });

    const closeBtn = screen.getByTestId("close-profile");
    expect(closeBtn.querySelector("svg")).toBeInTheDocument();
  });

  it("navigates to default authenticated path when close button clicked and no history", async () => {
    const renderResult = await act(async () => {
      return renderWithProviders({ initialEntries: ["/profile"] });
    });

    const router = renderResult.router;

    vi.spyOn(router.history, "canGoBack").mockReturnValue(false);

    const mockNavigate = vi.fn();
    vi.spyOn(router, "navigate").mockImplementation(mockNavigate);

    await user.click(screen.getByTestId("close-profile"));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: APP_CONFIG.defaultAuthenticatedPath,
        replace: true,
      }),
    );
  });

  it("calls history.back when there is previous history", async () => {
    const renderResult = await act(async () => {
      return renderWithProviders({
        initialEntries: [APP_CONFIG.defaultAuthenticatedPath, "/profile"],
      });
    });

    const router = renderResult.router;

    const mockBack = vi.fn();
    vi.spyOn(router.history, "back").mockImplementation(mockBack);

    await user.click(screen.getByTestId("close-profile"));

    expect(mockBack).toHaveBeenCalled();
  });
});
