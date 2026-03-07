// __tests__/app/components/PasswordResetForm.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PasswordResetForm from "@/app/components/PasswordResetForm";
import { supabase } from "@/lib/supabase";
import { useBannerStore } from "@/shared/store/bannerStore";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock("@/shared/store/bannerStore", () => ({
  useBannerStore: vi.fn(),
}));

describe("PasswordResetForm", () => {
  const mockResetPassword = vi.fn();
  const mockShowBanner = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    supabase.auth.resetPasswordForEmail = mockResetPassword;

    vi.mocked(useBannerStore).mockReturnValue({
      show: mockShowBanner,
    });
  });

  it("renders form elements correctly", () => {
    render(<PasswordResetForm />);

    expect(screen.getByTestId("password-form")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
    expect(screen.getByTestId("reset-submit")).toBeInTheDocument();
    expect(screen.getByText("Send Reset Link")).toBeInTheDocument();
    expect(screen.getByLabelText("Email for Reset Link")).toBeInTheDocument();
  });

  it("disables submit button when form is pristine or pending", () => {
    render(<PasswordResetForm />);

    const submitButton = screen.getByTestId("reset-submit");
    expect(submitButton).toBeDisabled();
  });

  it("shows validation error for invalid email", async () => {
    render(<PasswordResetForm />);

    const emailInput = screen.getByTestId("password-input");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });

    fireEvent.submit(screen.getByTestId("password-form"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "error",
        message: "Please enter a valid email address.",
      }),
    );
  });

  it("sends reset email and shows success banner on valid submission", async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null });

    render(<PasswordResetForm />);

    const emailInput = screen.getByTestId("password-input");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    fireEvent.submit(screen.getByTestId("password-form"));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("user@example.com", {
        redirectTo: expect.stringContaining("/update-password"),
      });
    });

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "success",
        message: "Password reset link sent. Check your email (including spam).",
      }),
    );

    expect(emailInput).toHaveValue("");
  });

  it("shows error banner when reset fails", async () => {
    mockResetPassword.mockRejectedValue(new Error("Network error"));

    render(<PasswordResetForm />);

    const emailInput = screen.getByTestId("password-input");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    fireEvent.submit(screen.getByTestId("password-form"));

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          message: expect.stringContaining("Network error"),
        }),
      );
    });
  });

  it("shows loading state during submission", async () => {
    mockResetPassword.mockImplementation(() => new Promise(() => {}));

    render(<PasswordResetForm />);

    const emailInput = screen.getByTestId("password-input");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    fireEvent.submit(screen.getByTestId("password-form"));

    await waitFor(() => {
      expect(screen.getByText("Sending...")).toBeInTheDocument();
      expect(screen.getByTestId("reset-submit")).toBeDisabled();
      expect(
        screen.getByTestId("reset-submit").querySelector("svg.animate-spin"),
      ).toBeInTheDocument();
    });
  });
});
