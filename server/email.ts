// server/email.ts
import nodemailer from "nodemailer";

const FROM_NAME = process.env.APP_NAME || "Do Tasks App";
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@dotasks.app";

// Singleton transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.zeptomail.eu",
      port: 465,
      secure: true,
      auth: {
        user: "emailapikey",
        pass: process.env.EMAIL_PASS || process.env.ZEPTOMAIL_TOKEN,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });

    // Silent early verification
    transporter.verify().catch(() => {});
  }
  return transporter;
}

export async function sendMailWithDebug(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text: html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      requestId: info.messageId || `smtp-${Date.now()}`,
    };
  } catch (error: unknown) {
    let code: string | undefined;

    // Safe narrowing for Nodemailer-specific properties
    if (error && typeof error === "object" && "code" in error) {
      code = String((error as { code?: unknown }).code);
    }

    console.error("SMTP send failed", {
      to,
      subject,
      message: error instanceof Error ? error.message : String(error),
      code,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
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

  return sendMailWithDebug(to, "Verify Your Email Address", html);
}

export async function sendResetPasswordEmail(to: string, resetToken: string) {
  const resetUrl = `${process.env.VITE_APP_URL || "http://localhost:8888"}/confirm-reset-password?token=${resetToken}`;

  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password. Click the link below to set a new password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link will expire in 1 hour. If you didn’t request a password reset, please ignore this email.</p>
  `;

  return sendMailWithDebug(to, "Reset Your Password", html);
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

  return sendMailWithDebug(
    oldEmail,
    "Your Email Address Has Been Changed",
    html,
  );
}

export async function sendPasswordChangeNotification(to: string) {
  const html = `
    <h1>Password Change Notification</h1>
    <p>The password for your account has been successfully changed.</p>
    <p>If you initiated this change, no further action is required. If you did not request this change, please contact support immediately at <a href="mailto:support@dotasks.app">support@dotasks.app</a>.</p>
    <p>Thank you,<br>Do Tasks App Team</p>
  `;

  return sendMailWithDebug(to, "Your Password Has Been Changed", html);
}
