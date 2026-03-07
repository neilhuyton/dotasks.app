// src/app/components/__tests__/ThemeProvider.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/app/components/ThemeProvider";

vi.mock("next-themes", () => {
  const mockThemeProvider = vi.fn(({ children, ...props }) => {
    return (
      <div
        data-testid="next-themes-provider"
        data-props={JSON.stringify(props)}
      >
        {children}
      </div>
    );
  });

  return {
    ThemeProvider: mockThemeProvider,
  };
});

describe("ThemeProvider", () => {
  it("renders children correctly", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Hello World</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("uses default props for next-themes", () => {
    render(
      <ThemeProvider>
        <span>content</span>
      </ThemeProvider>,
    );

    const provider = screen.getByTestId("next-themes-provider");
    const passedProps = JSON.parse(provider.getAttribute("data-props") || "{}");

    expect(passedProps.attribute).toBe("class");
    expect(passedProps.defaultTheme).toBe("dark");
    expect(passedProps.storageKey).toBe("vite-ui-theme");
    expect(passedProps.enableSystem).toBe(true);
  });

  it("overrides defaultTheme when provided", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <span>content</span>
      </ThemeProvider>,
    );

    const provider = screen.getByTestId("next-themes-provider");
    const passedProps = JSON.parse(provider.getAttribute("data-props") || "{}");

    expect(passedProps.defaultTheme).toBe("light");
  });

  it("overrides storageKey when provided", () => {
    render(
      <ThemeProvider storageKey="my-custom-theme">
        <span>content</span>
      </ThemeProvider>,
    );

    const provider = screen.getByTestId("next-themes-provider");
    const passedProps = JSON.parse(provider.getAttribute("data-props") || "{}");

    expect(passedProps.storageKey).toBe("my-custom-theme");
  });

  it("disables enableSystem when set to false", () => {
    render(
      <ThemeProvider enableSystem={false}>
        <span>content</span>
      </ThemeProvider>,
    );

    const provider = screen.getByTestId("next-themes-provider");
    const passedProps = JSON.parse(provider.getAttribute("data-props") || "{}");

    expect(passedProps.enableSystem).toBe(false);
  });

  it("passes additional next-themes props (like forcedTheme, disableTransitionOnChange)", () => {
    render(
      <ThemeProvider forcedTheme="pink" disableTransitionOnChange>
        <span>content</span>
      </ThemeProvider>,
    );

    const provider = screen.getByTestId("next-themes-provider");
    const passedProps = JSON.parse(provider.getAttribute("data-props") || "{}");

    expect(passedProps.forcedTheme).toBe("pink");
    expect(passedProps.disableTransitionOnChange).toBe(true);
  });

  it("does not crash with minimal props", () => {
    const { container } = render(
      <ThemeProvider>
        <div>minimal</div>
      </ThemeProvider>,
    );

    expect(container).toBeInTheDocument();
  });
});
