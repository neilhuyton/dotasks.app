import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/store/authStore";
import type { Session, User } from "@supabase/supabase-js";

vi.mock("@/store/authStore", () => {
  let mockUser: User | null = null;
  let mockSession: Session | null = null;

  const signIn = vi.fn();
  const waitUntilReady = vi.fn().mockImplementation(async () => mockSession);

  const mockState: {
    signIn: typeof signIn;
    waitUntilReady: typeof waitUntilReady;
    isInitialized: boolean;
    session: Session | null;
    user: User | null;
    loading: boolean;
  } = {
    signIn,
    waitUntilReady,
    isInitialized: true,
    session: mockSession,
    user: mockUser,
    loading: false,
  };

  const mockedUseAuthStore = vi.fn(
    (selector?: (state: typeof mockState) => unknown) =>
      selector ? selector(mockState) : mockState,
  );

  Object.defineProperty(mockedUseAuthStore, "getState", {
    value: () => mockState,
    configurable: true,
  });

  signIn.mockImplementation(async (email: string) => {
    mockSession = {
      user: { id: "mock-123", email } as User,
      access_token: "mock-token",
      refresh_token: "mock-refresh",
    } as Session;
    mockUser = mockSession.user;

    mockState.session = mockSession;
    mockState.user = mockUser;

    return { error: null };
  });

  return { useAuthStore: mockedUseAuthStore };
});

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe("Login Page (/login)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLoginPage = () =>
    renderWithProviders({ initialEntries: ["/login"] });

  it("renders heading and form", async () => {
    renderLoginPage();
    await screen.findByText("Login to your account");
  });

  it("shows loading state during sign in", async () => {
    const signIn = useAuthStore.getState().signIn;
    vi.mocked(signIn).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 80),
        ),
    );

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(await screen.findByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "longenough123");
    await user.click(screen.getByRole("button", { name: /Login/i }));

    await waitFor(() => {
      expect(screen.getByText("Logging in...")).toBeInTheDocument();
    });
  });

  it("redirects after successful login", async () => {
    const signIn = useAuthStore.getState().signIn;
    vi.mocked(signIn).mockResolvedValueOnce({ error: null });

    const { useNavigate } = await import("@tanstack/react-router");
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "valid123456");
    await user.click(screen.getByRole("button", { name: /Login/i }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledTimes(1);
    });

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.stringContaining("home"),
      }),
    );
  });
});
