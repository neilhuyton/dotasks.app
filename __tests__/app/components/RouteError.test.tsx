// src/app/components/__tests__/RouteError.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RouteError } from "@/app/components/RouteError";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children: React.ReactNode;
      to: string;
      [key: string]: unknown;
    }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

describe("RouteError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders default title and shows error.message when error is Error instance", () => {
    render(<RouteError error={new Error("Test error")} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("uses custom title, message, backTo and backLabel when provided", () => {
    render(
      <RouteError
        error={new Error("Database timeout")}
        title="Server Error"
        message="Our servers are taking a coffee break ☕"
        backLabel="Return to Dashboard"
        backTo="/dashboard"
      />,
    );
    expect(screen.getByText("Server Error")).toBeInTheDocument();
    expect(
      screen.getByText("Our servers are taking a coffee break ☕"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /return to dashboard/i }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("shows Try Again button only when reset function is provided", () => {
    const resetFn = vi.fn();
    const { rerender } = render(
      <RouteError error={new Error()} reset={resetFn} />,
    );
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();

    rerender(<RouteError error={new Error()} />);
    expect(
      screen.queryByRole("button", { name: /try again/i }),
    ).not.toBeInTheDocument();
  });

  it("shows error stack trace in development mode when error is Error", () => {
    vi.stubEnv("DEV", true);

    const error = new Error("Kaboom!");
    error.stack =
      "Error: Kaboom!\n    at src/some/component.tsx:42:5\n    at src/other/file.tsx:13:9";

    render(<RouteError error={error} />);

    expect(screen.getByText("Kaboom!")).toBeInTheDocument();
    expect(
      screen.getByText(/at src\/some\/component\.tsx:42:5/i),
    ).toBeInTheDocument();
  });

  it("does not show stack trace in production even when error is Error", () => {
    vi.stubEnv("DEV", false);

    const error = new Error("Secret crash");

    render(<RouteError error={error} />);

    expect(screen.getByText("Secret crash")).toBeInTheDocument();
    expect(screen.queryByText(/at/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/src/i)).not.toBeInTheDocument();
  });

  it("shows string error directly when error is a string", () => {
    render(<RouteError error="Network unreachable" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Network unreachable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home/i })).toBeInTheDocument();
  });

  it("falls back to generic message when error is neither Error nor string", () => {
    render(<RouteError error={null} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText("An unexpected error occurred"),
    ).toBeInTheDocument();
  });
});
