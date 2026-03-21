import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/components/AuthProvider";
import { useAuthStore } from "@/store/authStore";
import type { AuthState } from "@steel-cut/steel-lib";

vi.mock("@/store/authStore");

describe("AuthProvider", () => {
  let mockInitialize: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInitialize = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    const mockState: AuthState = {
      user: null,
      session: null,
      loading: false,
      error: null,
      isInitialized: true,

      initialize: mockInitialize,

      signIn: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),

      waitUntilReady: vi.fn().mockResolvedValue(null),

      // ── Required missing fields ────────────────────────────────────────
      lastRefreshFailed: false, // ← add this
      setLastRefreshFailed: vi.fn(), // ← add this

      changeUserEmail: vi.fn().mockResolvedValue(undefined), // ← add this
      updateUserPassword: vi.fn().mockResolvedValue(undefined), // ← add this

      // Optional / already present
      updateUserEmail: vi.fn(),
      setSession: vi.fn(),
    };

    vi.mocked(useAuthStore).mockImplementation((selector) => {
      if (typeof selector === "function") {
        return selector(mockState);
      }
      return mockState;
    });
  });

  it("calls initialize on mount", async () => {
    render(
      <AuthProvider>
        <div data-testid="child">Child Content</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });
  });

  it("renders children without crashing", () => {
    const { getByTestId } = render(
      <AuthProvider>
        <div data-testid="child">Child Content</div>
      </AuthProvider>,
    );

    expect(getByTestId("child")).toBeInTheDocument();
    expect(getByTestId("child")).toHaveTextContent("Child Content");
  });

  it("does not call initialize again on re-render when deps are stable", async () => {
    const { rerender } = render(
      <AuthProvider>
        <div>Child</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(mockInitialize).toHaveBeenCalledTimes(1));

    rerender(
      <AuthProvider>
        <div>Child Updated</div>
      </AuthProvider>,
    );

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });
});
