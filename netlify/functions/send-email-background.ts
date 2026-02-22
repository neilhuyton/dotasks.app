// netlify/functions/send-email-background.ts

import { sendMailWithDebug } from "../../server/email";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    // Invalid JSON → log once, respond 202 anyway (don't fail the caller)
    console.error("Invalid JSON in background email request");
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { type, to: providedTo, token, oldEmail, newEmail } = body;
  let to: string = providedTo;

  if (!to || typeof to !== "string") {
    console.error("Missing or invalid recipient email");
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }

  let subject: string;
  let html: string;

  switch (type) {
    case "verification": {
      if (typeof token !== "string") {
        console.error("Missing verification token");
        return new Response(JSON.stringify({ queued: true }), { status: 202 });
      }
      subject = "Verify Your Email Address";
      const verificationUrl = `${process.env.VITE_APP_URL || "http://localhost:8888"}/verify-email?token=${token}`;
      html = `<h1>Welcome!</h1><p>Please verify your email address by clicking the link below:</p><a href="${verificationUrl}">Verify Email</a><p>If you didn’t register, please ignore this email.</p>`;
      break;
    }

    case "reset-password": {
      if (typeof token !== "string") {
        console.error("Missing reset token");
        return new Response(JSON.stringify({ queued: true }), { status: 202 });
      }
      subject = "Reset Your Password";
      const resetUrl = `${process.env.VITE_APP_URL || "http://localhost:8888"}/confirm-reset-password?token=${token}`;
      html = `<h1>Password Reset Request</h1><p>You requested to reset your password. Click the link below:</p><a href="${resetUrl}">Reset Password</a><p>This link will expire in 1 hour. If you didn’t request this, ignore.</p>`;
      break;
    }

    case "email-change": {
      if (!oldEmail || !newEmail) {
        console.error("Missing old/new email for change notification");
        return new Response(JSON.stringify({ queued: true }), { status: 202 });
      }
      subject = "Your Email Address Has Been Changed";
      html = `<h1>Email Address Change Notification</h1><p>Your email has been changed to <strong>${newEmail}</strong>.</p><p>If you initiated this, no action needed. Otherwise, contact <a href="mailto:support@dotasks.app">support@dotasks.app</a>.</p><p>Thank you,<br>Do Tasks App Team</p>`;
      to = oldEmail;
      break;
    }

    case "password-change": {
      subject = "Your Password Has Been Changed";
      html = `<h1>Password Change Notification</h1><p>Your password was successfully updated.</p><p>If you did this, all good. If not, contact <a href="mailto:support@dotasks.app">support@dotasks.app</a> immediately.</p><p>Thank you,<br>Do Tasks App Team</p>`;
      break;
    }

    default:
      console.error(`Unknown email type: ${type}`);
      return new Response(JSON.stringify({ queued: true }), { status: 202 });
  }

  // Fire-and-forget the send
  sendMailWithDebug(to, subject, html).catch((err) => {
    console.error(`Failed to send ${type} email to ${to}:`, err.message || err);
  });

  // Always respond immediately
  return new Response(
    JSON.stringify({ success: true, message: "Email queued" }),
    {
      status: 202,
      headers: { "Content-Type": "application/json" },
    },
  );
};
