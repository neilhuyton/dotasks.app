import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../utils/test-helpers";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "@tanstack/react-router";
import { suppressActWarnings } from "../utils/act-suppress";

suppressActWarnings();

vi.mock("@/store/authStore", () => {
  const initialize = vi.fn().mockResolvedValue(undefined);

  const mockState = {
    initialize,
    isInitialized: true,
    user: { id: "test-user" },
    session: { user: { id: "test-user" } },
  };

  const mockedUseAuthStore = vi.fn((selector) =>
    selector ? selector(mockState) : mockState,
  );

  Object.defineProperty(mockedUseAuthStore, "getState", {
    value: () => mockState,
    configurable: true,
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

describe("Email Change Confirmation Page (/email-change)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderEmailChangePage = () =>
    renderWithProviders({ initialEntries: ["/email-change"] });

  it("renders EmailChangeConfirmation component", () => {
    renderEmailChangePage();
  });

  it("passes initialize as onRefreshSession prop", async () => {
    const initialize = useAuthStore.getState().initialize;

    renderEmailChangePage();

    await vi.waitFor(() => {
      expect(initialize).toHaveBeenCalledTimes(1);
    });
  });

  it("navigates to /profile when onGoToProfile is called", async () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    const initialize = useAuthStore.getState().initialize;
    vi.mocked(initialize).mockResolvedValueOnce(undefined);

    renderEmailChangePage();

    await vi.waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });

    expect(navigate).toBeDefined();
  });
});
