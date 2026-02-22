// server/email.ts
import dns from 'dns/promises'; // Node built-in for DNS debug

const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email"; // ← Changed to US endpoint (more reliable on Netlify/Lambda)

function logEnvStatus() {
  console.log("=== ZeptoMail API Environment check ===");
  console.log("ZEPTOMAIL_API_URL:", ZEPTOMAIL_API_URL);
  console.log(
    "EMAIL_PASS (token):",
    process.env.EMAIL_PASS ? "present" : "MISSING",
  );
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM || "MISSING");
  console.log("APP_NAME:", process.env.APP_NAME || "MISSING");
  console.log("=======================================");
}

logEnvStatus();

const FROM_NAME = process.env.APP_NAME || "Do Tasks App";
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@dotasks.app";

export async function sendMailWithDebug(
  to: string,
  subject: string,
  html: string,
) {
  console.log("Preparing to send via ZeptoMail API:");
  console.log("From:", `${FROM_NAME} <${FROM_EMAIL}>`);
  console.log("To:", to);
  console.log("Subject:", subject);

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
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn("ZeptoMail fetch aborted after 15 seconds (AbortController)");
  }, 15000);

  try {
    // Debug: Try to resolve hostname (helps spot DNS issues in Lambda)
    console.log("Resolving ZeptoMail hostname...");
    try {
      const addresses = await dns.resolve(new URL(ZEPTOMAIL_API_URL).hostname);
      console.log("DNS resolved successfully:", addresses);
    } catch (dnsErr: any) {
      console.error("DNS resolution failed:", dnsErr.message || dnsErr);
    }

    console.log("Calling ZeptoMail API...");
    console.log("Headers (token redacted):", {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-enczapikey ${process.env.EMAIL_PASS ? '[present]' : '[MISSING]'}`,
    });

    const start = Date.now();

    // Race fetch with hard timeout in case abort doesn't fire
    const response = await Promise.race([
      fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Zoho-enczapikey ${process.env.EMAIL_PASS}`, // Official examples use capital Z
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Hard 15s timeout on fetch")), 15000)
      ),
    ]);

    clearTimeout(timeoutId);

    const duration = Date.now() - start;
    console.log(`ZeptoMail API responded in ${duration} ms - Status: ${response.status}`);

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Email accepted by ZeptoMail!");
      console.log("Request ID:", data.request_id || "N/A");
      return { success: true, requestId: data.request_id };
    } else {
      console.error("❌ ZeptoMail API error:", response.status, data);
      return {
        success: false,
        error: data.message || data.error?.message || `API error ${response.status}`,
      };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("=== ZeptoMail API call FAILED ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.stack) console.error("Stack:", error.stack.substring(0, 800));
    return {
      success: false,
      error: error.message || "Network / timeout / abort error",
    };
  }
}

// The other functions (sendVerificationEmail, etc.) remain unchanged — they call sendMailWithDebug
// Just re-export them as before

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