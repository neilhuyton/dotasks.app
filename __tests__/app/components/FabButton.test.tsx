// __tests__/app/components/FabButton.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FabButton } from "@/app/components/FabButton";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    Link: vi.fn(({ children, to, params, ...props }) => (
      <a
        href={to}
        data-testid={props["data-testid"]}
        data-to={to}
        data-params={JSON.stringify(params || {})}
        {...props}
      >
        {children}
      </a>
    )),
  };
});

describe("FabButton", () => {
  const defaultProps = {
    to: "/tasks/new",
    label: "Create new task",
    testId: "fab-create-task",
  };

  it("renders with correct fixed positioning and styling classes", () => {
    render(<FabButton {...defaultProps} />);

    const button = screen.getByTestId("fab-create-task");
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("fixed bottom-20 right-4 z-50");
    expect(button).toHaveClass("rounded-full w-14 h-14");
    expect(button).toHaveClass("shadow-xl hover:shadow-2xl");
    expect(button).toHaveClass("bg-primary hover:bg-primary/90");
    expect(button).toHaveClass("text-primary-foreground");
  });

  it("renders Plus icon with correct size on mobile", () => {
    render(<FabButton {...defaultProps} />);

    const icon = screen.getByTestId("fab-create-task").querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-7 w-7");
  });

  it("renders larger Plus icon and adjusts position on md breakpoint", () => {
    render(<FabButton {...defaultProps} />);

    const button = screen.getByTestId("fab-create-task");
    expect(button).toHaveClass("md:bottom-16 md:right-10 md:w-16 md:h-16");

    const icon = button.querySelector("svg");
    expect(icon).toHaveClass("md:h-8 md:w-8");
  });

  it("passes custom testId to the button", () => {
    render(<FabButton {...defaultProps} testId="custom-fab-id" />);
    expect(screen.getByTestId("custom-fab-id")).toBeInTheDocument();
  });

  it('wraps content in Link with correct "to" prop', () => {
    render(<FabButton {...defaultProps} />);

    const button = screen.getByTestId("fab-create-task");
    expect(button).toHaveAttribute("data-to", "/tasks/new");
    expect(button).toHaveAttribute("href", "/tasks/new");
  });

  it("passes params to Link when provided", () => {
    const params = { projectId: "abc123" };
    render(<FabButton {...defaultProps} params={params} />);

    const button = screen.getByTestId("fab-create-task");
    expect(button).toHaveAttribute("data-params", JSON.stringify(params));
  });

  it("includes sr-only label for accessibility", () => {
    render(<FabButton {...defaultProps} />);
    expect(screen.getByText("Create new task")).toHaveClass("sr-only");
  });

  it("applies sonar-ripple class when pulse prop is true", () => {
    render(<FabButton {...defaultProps} pulse />);
    expect(screen.getByTestId("fab-create-task")).toHaveClass("sonar-ripple");
  });

  it("does not apply sonar-ripple class when pulse is false", () => {
    render(<FabButton {...defaultProps} pulse={false} />);
    expect(screen.getByTestId("fab-create-task")).not.toHaveClass(
      "sonar-ripple",
    );
  });

  it("forwards additional button props (e.g. disabled)", () => {
    render(<FabButton {...defaultProps} disabled />);
    const button = screen.getByTestId("fab-create-task");
    expect(button).toHaveAttribute("disabled");
  });

  it("clicking the button uses correct href", () => {
    render(<FabButton {...defaultProps} testId="clickable-fab" />);

    const button = screen.getByTestId("clickable-fab");
    expect(button).toHaveAttribute("href", "/tasks/new");
  });
});
