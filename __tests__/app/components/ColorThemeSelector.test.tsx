// __tests__/components/ColorThemeSelector.test.tsx

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorThemeSelector } from "@/app/components/ColorThemeSelector";
import { colorThemes } from "@/lib/theme-presets";

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("ColorThemeSelector", () => {
  const mockThemes = Object.keys(colorThemes) as (keyof typeof colorThemes)[];

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute("data-color-theme");
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the trigger button with Paintbrush icon and color indicator", () => {
    render(<ColorThemeSelector />);

    const button = screen.getByRole("button", { name: /toggle color theme/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("h-8", "w-8", "p-0");

    expect(button.querySelector("svg.lucide-paintbrush")).toBeInTheDocument();

    const dot = button.querySelector("span.rounded-full");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-[var(--primary)]");
  });

  it('defaults to "blue" theme when no saved preference', () => {
    render(<ColorThemeSelector />);

    expect(document.documentElement.getAttribute("data-color-theme")).toBe(
      "blue",
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "app-color-theme",
      "blue",
    );
  });

  it("loads saved theme from localStorage on mount", () => {
    // Use a real theme key that exists in colorThemes
    localStorageMock.getItem.mockReturnValue("green");

    render(<ColorThemeSelector />);

    expect(document.documentElement.getAttribute("data-color-theme")).toBe(
      "green",
    );
    expect(localStorageMock.getItem).toHaveBeenCalledWith("app-color-theme");
  });

  it("opens dropdown with all theme options when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<ColorThemeSelector />);

    const button = screen.getByRole("button", { name: /toggle color theme/i });
    await user.click(button);

    await waitFor(() => {
      mockThemes.forEach((key) => {
        const theme = colorThemes[key];
        expect(screen.getByText(theme.name)).toBeInTheDocument();
      });
    });

    const items = screen.getAllByRole("menuitem");
    expect(items.length).toBe(mockThemes.length);

    items.forEach((item) => {
      const dot = item.querySelector("div.rounded-full");
      expect(dot).toBeInTheDocument();
    });
  });

  it('highlights active theme and shows "Active" label', async () => {
    localStorageMock.getItem.mockReturnValue("green");
    const user = userEvent.setup();
    render(<ColorThemeSelector />);

    const button = screen.getByRole("button", { name: /toggle color theme/i });
    await user.click(button);

    await waitFor(() => {
      const greenItem = screen
        .getByText(colorThemes.green.name)
        .closest('[role="menuitem"]');
      expect(greenItem).toHaveClass("bg-accent");
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  it("changes theme on selection, updates localStorage and document attribute", async () => {
    const user = userEvent.setup();
    render(<ColorThemeSelector />);

    const button = screen.getByRole("button", { name: /toggle color theme/i });
    await user.click(button);

    const redItem = await screen.findByText(colorThemes.red.name);
    await user.click(redItem);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-color-theme")).toBe(
        "red",
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "app-color-theme",
        "red",
      );
    });
  });

  it("persists theme change across re-renders", async () => {
    const { rerender } = render(<ColorThemeSelector />);

    const button = screen.getByRole("button", { name: /toggle color theme/i });
    await userEvent.click(button);

    const greenItem = await screen.findByText(colorThemes.green.name);
    await userEvent.click(greenItem);

    rerender(<ColorThemeSelector />);

    expect(document.documentElement.getAttribute("data-color-theme")).toBe(
      "green",
    );
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      "app-color-theme",
      "green",
    );
  });

  it("applies correct primary color dot for each theme", async () => {
    const user = userEvent.setup();
    render(<ColorThemeSelector />);

    await user.click(
      screen.getByRole("button", { name: /toggle color theme/i }),
    );

    mockThemes.forEach((key) => {
      const theme = colorThemes[key];
      const item = screen.getByText(theme.name).closest('[role="menuitem"]');
      const dot = item?.querySelector("div.rounded-full");
      expect(dot).toHaveStyle(`background-color: ${theme.primary}`);
    });
  });
});
