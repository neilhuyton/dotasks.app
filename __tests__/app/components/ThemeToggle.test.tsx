// src/app/components/__tests__/ThemeToggle.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useTheme } from "next-themes";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

describe("ThemeToggle", () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTheme).mockReturnValue({
      setTheme: mockSetTheme,
      theme: "light",
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      forcedTheme: undefined,
    });
  });

  it("renders without crashing and shows the toggle button", () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("has accessible sr-only label", () => {
    render(<ThemeToggle />);
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
  });

  it("opens dropdown and calls setTheme('light') when Light is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByTestId("theme-toggle"));
    await user.click(screen.getByText("Light"));

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme('dark') when Dark is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByTestId("theme-toggle"));
    await user.click(screen.getByText("Dark"));

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme('system') when System is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByTestId("theme-toggle"));
    await user.click(screen.getByText("System"));

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });
});
