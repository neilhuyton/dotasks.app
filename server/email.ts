// server/email.ts
const ZEPTOMAIL_API_URL = "https://api.zeptomail.eu/v1.1/email";

const FROM_NAME = process.env.APP_NAME || "Do Tasks App";
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@dotasks.app";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const payload = {
    from: {
      address: FROM_EMAIL,
      name: FROM_NAME,
    },
    to: [
      {
        email_address: {
          address: to,
        },
      },
    ],
    subject,
    htmlbody: html,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(ZEPTOMAIL_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Zoho-enczapikey ${process.env.EMAIL_PASS}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok) {
      return { success: true, requestId: data.request_id };
    }

    console.error("ZeptoMail API error", {
      status: response.status,
      response: data,
      to,
      subject,
    });

    return {
      success: false,
      error: data.message || data.error?.message || `HTTP ${response.status}`,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    let errorMessage = "Unknown error";
    let errorCode: string | undefined;
    let errorName: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorName = error.name;

      // Some fetch/network errors expose .code (non-standard but common)
      if (
        "code" in error &&
        typeof (error as Record<string, unknown>).code === "string"
      ) {
        errorCode = (error as Record<string, unknown>).code as string;
      }
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object" && "message" in error) {
      errorMessage = String((error as { message: unknown }).message);
    }

    console.error("ZeptoMail send failed", {
      message: errorMessage,
      code: errorCode,
      name: errorName,
      to,
      subject,
    });

    return {
      success: false,
      error: errorMessage || "Network / timeout error",
    };
  }
}

export async function sendVerificationEmail(
  to: string,
  verificationToken: string,
) {
  const verificationUrl = `${process.env.VITE_APP_URL || "http://localhost:8888"}/verify-email?token=${verificationToken}`;

  const html = `
    <h1>Welcome!</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verificationUrl}">Verify Email</a>
    <p>If you didn’t register, please ignore this email.</p>
  `;

  return sendEmail(to, "Verify Your Email Address", html);
}

export async function sendResetPasswordEmail(to: string, resetToken: string) {
  const resetUrl = `${process.env.VITE_APP_URL || "http://localhost:8888"}/confirm-reset-password?token=${resetToken}`;

  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password. Click the link below to set a new password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link will expire in 1 hour. If you didn’t request a password reset, please ignore this email.</p>
  `;

  return sendEmail(to, "Reset Your Password", html);
}

export async function sendEmailChangeNotification(
  oldEmail: string,
  newEmail: string,
) {
  const html = `
    <h1>Email Address Change Notification</h1>
    <p>The email address associated with your account has been changed to <strong>${newEmail}</strong>.</p>
    <p>If you initiated this change, no further action is required. If you did not request this change, please contact support immediately at <a href="mailto:support@dotasks.app">support@dotasks.app</a>.</p>
    <p>Thank you,<br>Do Tasks App Team</p>
  `;

  return sendEmail(oldEmail, "Your Email Address Has Been Changed", html);
}

export async function sendPasswordChangeNotification(to: string) {
  const html = `
    <h1>Password Change Notification</h1>
    <p>The password for your account has been successfully changed.</p>
    <p>If you initiated this change, no further action is required. If you did not request this change, please contact support immediately at <a href="mailto:support@dotasks.app">support@dotasks.app</a>.</p>
    <p>Thank you,<br>Do Tasks App Team</p>
  `;

  return sendEmail(to, "Your Password Has Been Changed", html);
}
