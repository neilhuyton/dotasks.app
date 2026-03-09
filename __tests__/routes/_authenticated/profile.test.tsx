// __tests__/routes/_authenticated/profile.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useAuthStore } from "@/store/authStore";
import { renderWithProviders } from "../../../__tests__/utils/test-helpers";

vi.mock("@steel-cut/steel-lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@steel-cut/steel-lib")>();
  return {
    ...actual,
    ActionBanner: () => null,
    useBannerStore: vi.fn(() => ({
      show: vi.fn(),
    })),
  };
});

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
    const mockUser = {
      id: "test-id",
      email: "test@example.com",
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
    };

    act(() => {
      useAuthStore.setState({
        user: mockUser,
        loading: false,
      });
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

  it("navigates to /lists when close button clicked and no history", async () => {
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
        to: "/lists",
        replace: true,
      }),
    );
  });

  it("calls history.back when there is previous history", async () => {
    const renderResult = await act(async () => {
      return renderWithProviders({
        initialEntries: ["/lists", "/profile"],
      });
    });

    const router = renderResult.router;

    const mockBack = vi.fn();
    vi.spyOn(router.history, "back").mockImplementation(mockBack);

    await user.click(screen.getByTestId("close-profile"));

    expect(mockBack).toHaveBeenCalled();
  });
});
