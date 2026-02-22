// server/email.ts

import nodemailer from "nodemailer";

function logEnvStatus() {
  console.log("=== Environment variables check ===");
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST || "MISSING");
  console.log("EMAIL_PORT:", process.env.EMAIL_PORT || "MISSING");
  console.log("EMAIL_USER:", process.env.EMAIL_USER ? "present" : "MISSING");
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "present (hidden)" : "MISSING");
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM || "MISSING");
  console.log("APP_NAME:", process.env.APP_NAME || "MISSING (will use empty)");
  console.log("VITE_APP_URL:", process.env.VITE_APP_URL || "using fallback localhost");
  console.log("===================================");
}

// Run once when module loads (good for serverless cold starts)
logEnvStatus();

const requiredEnvVars = ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM"];
const missing = requiredEnvVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error("CRITICAL: Missing required environment variables:", missing.join(", "));
}

let transporter: nodemailer.Transporter;

try {
  console.log("Creating Nodemailer transporter...");

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465, // usually true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Very useful for debugging SMTP issues in production logs
    debug: true,
    logger: true,
    // Increase timeouts if you suspect slow SMTP server
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  // Optional: verify connection (helps catch issues early)
  console.log("Verifying transporter connection...");
  transporter.verify((error) => {
    if (error) {
      console.error("Transporter verification FAILED:", error);
    } else {
      console.log("Transporter verified successfully — SMTP connection looks good");
    }
  });

} catch (err) {
  console.error("Failed to create transporter:", err);
}

const FROM = `${process.env.APP_NAME || "App"} <${process.env.EMAIL_FROM || "no-reply@invalid.local"}>`;

async function sendMailWithDebug(mailOptions: nodemailer.SendMailOptions) {
  console.log("Preparing to send email:");
  console.log("From:", mailOptions.from);
  console.log("To:", mailOptions.to);
  console.log("Subject:", mailOptions.subject);

  try {
    console.log("Calling transporter.sendMail()...");
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Preview URL (if available):", nodemailer.getTestMessageUrl?.(info));
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("=== EMAIL SEND FAILED ===");
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    if (error.response) console.error("SMTP response:", error.response);
    if (error.stack) console.error("Stack:", error.stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    return { success: false, error: error.message || "Unknown error" };
  }
}

export async function sendVerificationEmail(
  to: string,
  verificationToken: string,
) {
  const verificationUrl = `${
    process.env.VITE_APP_URL || "http://localhost:8888"
  }/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: FROM,
    to,
    subject: "Verify Your Email Address boop",
    html: `
      <h1>Welcome!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>If you didn’t register, please ignore this email.</p>
    `,
  };

  return sendMailWithDebug(mailOptions);
}

export async function sendResetPasswordEmail(to: string, resetToken: string) {
  const resetUrl = `${
    process.env.VITE_APP_URL || "http://localhost:8888"
  }/confirm-reset-password?token=${resetToken}`;

  const mailOptions = {
    from: FROM,
    to,
    subject: "Reset Your Password",
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour. If you didn’t request a password reset, please ignore this email.</p>
    `,
  };

  return sendMailWithDebug(mailOptions);
}

export async function sendEmailChangeNotification(
  oldEmail: string,
  newEmail: string,
) {
  const mailOptions = {
    from: FROM,
    to: oldEmail,
    subject: "Your Email Address Has Been Changed",
    html: `
      <h1>Email Address Change Notification</h1>
      <p>The email address associated with your account has been changed to <strong>${newEmail}</strong>.</p>
      <p>If you initiated this change, no further action is required. If you did not request this change, please contact support immediately at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>.</p>
      <p>Thank you,<br>Your App Team</p>
    `,
  };

  return sendMailWithDebug(mailOptions);
}

export async function sendPasswordChangeNotification(to: string) {
  const mailOptions = {
    from: FROM,
    to,
    subject: "Your Password Has Been Changed",
    html: `
      <h1>Password Change Notification</h1>
      <p>The password for your account has been successfully changed.</p>
      <p>If you initiated this change, no further action is required. If you did not request this change, please contact support immediately at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>.</p>
      <p>Thank you,<br>Your App Team</p>
    `,
  };

  return sendMailWithDebug(mailOptions);
}