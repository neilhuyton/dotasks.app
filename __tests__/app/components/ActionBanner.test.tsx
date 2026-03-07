// __tests__/components/ActionBanner.test.tsx

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";
import { ActionBanner } from "@/app/components/ActionBanner";
import { useBannerStore } from "@/shared/store/bannerStore";

interface Banner {
  message: string;
  variant?: "success" | "error" | "info";
  duration?: number;
}

vi.mock("@/shared/store/bannerStore", () => {
  let currentBanner: Banner | null = null;
  const hide = vi.fn();

  const useBannerStoreMock = vi.fn(() => ({
    banner: currentBanner,
    hide,
  }));

  return {
    useBannerStore: Object.assign(useBannerStoreMock, {
      __setBanner: (banner: Banner | null) => {
        currentBanner = banner;
      },
      __getHide: () => hide,
    }),
  };
});

const mockedUseBannerStore = useBannerStore as typeof useBannerStore & {
  __setBanner: (b: Banner | null) => void;
  __getHide: () => ReturnType<typeof vi.fn>;
};

describe("ActionBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseBannerStore.__setBanner(null);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when banner is null", () => {
    render(<ActionBanner />);
    expect(screen.queryByTestId("banner-message")).not.toBeInTheDocument();
  });

  it("renders message and close button when banner exists", () => {
    mockedUseBannerStore.__setBanner({
      message: "Task created!",
      variant: "success",
      duration: 4000,
    });

    render(<ActionBanner />);

    expect(screen.getByTestId("banner-message")).toHaveTextContent(
      "Task created!",
    );
    expect(
      screen.getByRole("button", { name: "Close banner" }),
    ).toBeInTheDocument();
  });

  it("applies correct role & aria-live for error variant", () => {
    mockedUseBannerStore.__setBanner({
      message: "Failed to delete list",
      variant: "error",
    });

    render(<ActionBanner />);

    const portalRoot = screen
      .getByText("Failed to delete list")
      .closest("div[role]");
    expect(portalRoot).toHaveAttribute("role", "alert");
    expect(portalRoot).toHaveAttribute("aria-live", "assertive");
  });

  it("auto-hides after duration", async () => {
    const hide = mockedUseBannerStore.__getHide();

    mockedUseBannerStore.__setBanner({
      message: "Saved",
      duration: 800,
    });

    render(<ActionBanner />);

    await vi.advanceTimersByTime(900);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("does not auto-hide when duration = 0", () => {
    const hide = mockedUseBannerStore.__getHide();

    mockedUseBannerStore.__setBanner({
      message: "Persistent info",
      variant: "info",
      duration: 0,
    });

    render(<ActionBanner />);
    vi.advanceTimersByTime(5000);
    expect(hide).not.toHaveBeenCalled();
  });

  it("pauses timer when hovered", async () => {
    const hide = mockedUseBannerStore.__getHide();

    mockedUseBannerStore.__setBanner({
      message: "Check email",
      duration: 2000,
    });

    render(<ActionBanner />);

    const container = screen.getByRole("status");
    await userEvent.hover(container);

    await vi.advanceTimersByTime(3000);
    expect(hide).not.toHaveBeenCalled();

    await userEvent.unhover(container);
    await vi.advanceTimersByTime(2200);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("pauses timer when focused", async () => {
    const hide = mockedUseBannerStore.__getHide();

    mockedUseBannerStore.__setBanner({
      message: "Settings updated",
      duration: 1500,
    });

    render(<ActionBanner />);

    const container = screen.getByRole("status");

    await act(async () => {
      container.focus();
    });

    await vi.advanceTimersByTime(3000);
    expect(hide).not.toHaveBeenCalled();

    await act(async () => {
      container.blur();
    });

    await vi.advanceTimersByTime(2000);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("calls hide when close button clicked", async () => {
    const hide = mockedUseBannerStore.__getHide();

    mockedUseBannerStore.__setBanner({
      message: "Welcome!",
    });

    render(<ActionBanner />);

    const closeBtn = screen.getByRole("button", { name: "Close banner" });
    await userEvent.click(closeBtn);

    expect(hide).toHaveBeenCalledTimes(1);
  });
});
