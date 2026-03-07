// __tests__/app/components/CurrentEmailSection.test.tsx

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CurrentEmailSection from "@/app/components/CurrentEmailSection";

describe("CurrentEmailSection", () => {
  it('shows "Current Email" label', () => {
    render(
      <CurrentEmailSection currentEmail="test@example.com" hasUser={true} />,
    );
    expect(screen.getByText("Current Email")).toBeInTheDocument();
  });

  it("displays the email when user exists (hasUser = true)", () => {
    const email = "john.doe@company.com";
    render(<CurrentEmailSection currentEmail={email} hasUser={true} />);
    const emailDisplay = screen.getByTestId("current-email");
    expect(emailDisplay).toBeInTheDocument();
    expect(emailDisplay).toHaveTextContent(email);
    expect(emailDisplay).toHaveClass("break-all");
    expect(emailDisplay).toHaveClass("bg-muted/50");
    expect(emailDisplay).toHaveClass("rounded-lg");
    expect(emailDisplay).toHaveClass("border");
  });

  it("shows loading message when hasUser = false", () => {
    render(
      <CurrentEmailSection
        currentEmail="whatever@domain.com"
        hasUser={false}
      />,
    );
    expect(
      screen.getByText("Loading profile information..."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("current-email")).not.toBeInTheDocument();
  });

  it("applies break-all class even on very long email addresses", () => {
    const veryLongEmail =
      "super.long.email.address.that.should.break@very.long.domain.name.example.com";
    render(<CurrentEmailSection currentEmail={veryLongEmail} hasUser={true} />);
    const emailElement = screen.getByTestId("current-email");
    expect(emailElement).toHaveTextContent(veryLongEmail);
    expect(emailElement).toHaveClass("break-all");
  });

  it("still shows the label even when hasUser = false", () => {
    render(<CurrentEmailSection currentEmail="" hasUser={false} />);
    expect(screen.getByText("Current Email")).toBeInTheDocument();
    expect(
      screen.getByText("Loading profile information..."),
    ).toBeInTheDocument();
  });
});
