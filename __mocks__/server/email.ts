// __mocks__/server/email.ts

import { vi } from "vitest";

export const sendVerificationEmail = vi.fn().mockResolvedValue({
  success: true,
  requestId: "mock-verification-sent-" + Date.now(),
});

export const sendResetPasswordEmail = vi.fn().mockResolvedValue({
  success: true,
  requestId: "mock-reset-sent-" + Date.now(),
});

export const sendEmailChangeNotification = vi.fn().mockResolvedValue({
  success: true,
  requestId: "mock-email-change-" + Date.now(),
});

export const sendPasswordChangeNotification = vi.fn().mockResolvedValue({
  success: true,
  requestId: "mock-password-change-" + Date.now(),
});

export const sendMailWithDebug = vi.fn().mockResolvedValue({
  success: true,
  requestId: "mock-debug-sent-" + Date.now(),
});
