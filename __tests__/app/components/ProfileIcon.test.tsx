// __tests__/app/components/ProfileIcon.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileIcon from "@/app/components/ProfileIcon";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();

  return {
    ...actual,
    Link: ({
      to,
      children,
      ...props
    }: {
      to: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

describe("ProfileIcon", () => {
  it("renders without crashing", () => {
    render(<ProfileIcon />);
    expect(screen.getByTestId("profile-icon")).toBeInTheDocument();
  });

  it("renders as a link to /profile", () => {
    render(<ProfileIcon />);
    const link = screen.getByTestId("profile-icon");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/profile");
  });

  it("contains the UserIcon (svg)", () => {
    render(<ProfileIcon />);
    const link = screen.getByTestId("profile-icon");
    expect(link.querySelector("svg")).toBeInTheDocument();
  });

  it("has correct aria-label for accessibility", () => {
    render(<ProfileIcon />);
    expect(screen.getByTestId("profile-icon")).toHaveAttribute(
      "aria-label",
      "User Profile",
    );
  });

  it("renders the icon with size h-5 w-5", () => {
    render(<ProfileIcon />);
    const svg = screen.getByTestId("profile-icon").querySelector("svg");
    expect(svg).toHaveClass("h-5");
    expect(svg).toHaveClass("w-5");
  });
});
