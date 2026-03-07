// __tests__/app/components/LogoutSection.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LogoutSection from "@/app/components/LogoutSection";
import { useAuthStore } from "@/shared/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

vi.mock("@/shared/store/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

describe("LogoutSection", () => {
  const mockSignOut = vi.fn().mockResolvedValue(undefined);
  const mockClear = vi.fn();
  const mockQueryClient = { clear: mockClear } as unknown as QueryClient;

  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockReturnValue({ signOut: mockSignOut });
    vi.mocked(useQueryClient).mockReturnValue(mockQueryClient);

    originalLocation = window.location;

    // Replace window.location with a mock object
    Object.defineProperty(window, "location", {
      value: {
        replace: vi.fn(),
        href: "http://localhost:3000",
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("renders logout button", () => {
    render(<LogoutSection />);

    expect(screen.getByTestId("logout-button")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("shows confirmation dialog when clicking logout button", async () => {
    render(<LogoutSection />);

    fireEvent.click(screen.getByTestId("logout-button"));

    expect(
      await screen.findByText("Are you sure you want to log out?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You will be signed out of your account."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("calls signOut, clears storage, clears query cache and redirects on confirm", async () => {
    render(<LogoutSection />);

    fireEvent.click(screen.getByTestId("logout-button"));
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);

    expect(localStorage.removeItem).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalledTimes(1);

    expect(window.location.replace).toHaveBeenCalledWith("/login");
  });

  it("does not redirect if cancel is clicked", () => {
    render(<LogoutSection />);

    fireEvent.click(screen.getByTestId("logout-button"));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      screen.queryByText("Are you sure you want to log out?"),
    ).not.toBeInTheDocument();
    expect(window.location.replace).not.toHaveBeenCalled();
  });
});
