// __tests__/app/components/ProfileHeader.test.tsx

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileHeader from "@/app/components/ProfileHeader";

describe("ProfileHeader", () => {
  it("renders the profile heading", () => {
    render(<ProfileHeader />);

    expect(screen.getByTestId("profile-heading")).toBeInTheDocument();
  });

  it("displays the correct heading text", () => {
    render(<ProfileHeader />);

    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("uses an h1 element for the heading", () => {
    render(<ProfileHeader />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Profile",
    );
  });
});
