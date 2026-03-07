// __tests__/app/components/EmailChangeForm.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailChangeForm from "@/app/components/EmailChangeForm";
import { useBannerStore } from "@/shared/store/bannerStore";
import { http, HttpResponse } from "msw";
import { server } from "../../../__mocks__/server";

vi.mock("@/shared/store/bannerStore", () => ({
  useBannerStore: vi.fn(() => ({
    show: vi.fn(),
  })),
}));

describe("EmailChangeForm", () => {
  const mockShowBanner = vi.fn();
  const defaultProps = {
    currentEmail: "current@example.com",
    hasUser: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBannerStore).mockReturnValue({ show: mockShowBanner });
    server.resetHandlers();
  });

  it("renders form elements correctly when user exists", () => {
    render(<EmailChangeForm {...defaultProps} />);
    expect(screen.getByText("New Email")).toBeInTheDocument();
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("your.new@email.com"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("email-submit")).toBeInTheDocument();
    expect(screen.getByTestId("email-submit")).toBeDisabled();
  });

  it("disables input and button when hasUser is false", () => {
    render(
      <EmailChangeForm currentEmail="current@example.com" hasUser={false} />,
    );
    expect(screen.getByTestId("email-input")).toBeDisabled();
    expect(screen.getByTestId("email-submit")).toBeDisabled();
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<EmailChangeForm {...defaultProps} />);
    const input = screen.getByTestId("email-input");
    await user.type(input, "invalid-email");
    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
  });

  it("shows info banner when submitting same email as current", async () => {
    const user = userEvent.setup();
    render(<EmailChangeForm {...defaultProps} />);
    const input = screen.getByTestId("email-input");
    await user.type(input, "current@example.com");
    const button = screen.getByTestId("email-submit");
    await user.click(button);
    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "This is already your current email.",
        variant: "info",
      }),
    );
  });

  it("submits form and shows success banner on successful change", async () => {
    server.use(
      http.put(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`,
        async ({ request }) => {
          const body = (await request.json()) as { email?: string };
          if (body?.email === "newemail@domain.com") {
            return HttpResponse.json({}, { status: 200 });
          }
          return HttpResponse.json(
            { error: { message: "Unexpected email" } },
            { status: 400 },
          );
        },
      ),
    );

    const user = userEvent.setup();
    render(<EmailChangeForm {...defaultProps} />);

    const input = screen.getByTestId("email-input");
    await user.type(input, "newemail@domain.com");

    await user.click(screen.getByTestId("email-submit"));

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Confirmation emails sent"),
          variant: "success",
        }),
      );
    });
  });

  it("shows error banner on fetch failure", async () => {
    server.use(
      http.put(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`,
        async () => {
          return HttpResponse.json(
            { error: { message: "Email already in use" } },
            { status: 400 },
          );
        },
      ),
    );

    const user = userEvent.setup();
    render(<EmailChangeForm {...defaultProps} />);

    const input = screen.getByTestId("email-input");
    await user.type(input, "taken@example.com");

    await user.click(screen.getByTestId("email-submit"));

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Email already in use"),
          variant: "error",
        }),
      );
    });
  });

  it("shows loading state during submission", async () => {
    server.use(
      http.put(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`,
        async () => {
          return new Promise((resolve) =>
            setTimeout(() => {
              resolve(HttpResponse.json({}, { status: 200 }));
            }, 100),
          );
        },
      ),
    );

    const user = userEvent.setup();
    render(<EmailChangeForm {...defaultProps} />);

    await user.type(screen.getByTestId("email-input"), "newemail@domain.com");
    await user.click(screen.getByTestId("email-submit"));

    await waitFor(() => {
      expect(screen.getByText("Requesting change...")).toBeInTheDocument();
    });
  });

  it("resets form after successful submission", async () => {
    server.use(
      http.put(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`,
        async () => {
          return HttpResponse.json({}, { status: 200 });
        },
      ),
    );

    const user = userEvent.setup();
    render(<EmailChangeForm {...defaultProps} />);

    const input = screen.getByTestId("email-input");
    await user.type(input, "newemail@domain.com");

    await user.click(screen.getByTestId("email-submit"));

    await waitFor(
      () => {
        expect(input).toHaveValue("");
      },
      { timeout: 5000 },
    );
  });
});
