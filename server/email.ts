// server/email.ts
import nodemailer from 'nodemailer';

const FROM_NAME = process.env.APP_NAME || 'Do Tasks App';
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@dotasks.app';

// Singleton transporter (recommended in serverless — reuses connections when possible)
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.zeptomail.eu',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: 'emailapikey',
        pass: process.env.EMAIL_PASS || process.env.ZEPTOMAIL_TOKEN, // support both names
      },
      // Serverless-friendly timeouts
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 20000,
      // Logging (matches your debug style)
      logger: true,
      debug: process.env.NODE_ENV !== 'production',
      // Optional: pool settings to reduce cold-start overhead
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });

    // Optional: verify once on first use
    transporter.verify().then(
      () => console.log('✅ ZeptoMail SMTP connection ready'),
      (err) => console.error('SMTP verify failed on init:', err.message),
    );
  }
  return transporter;
}

function logEnvStatus() {
  console.log('=== ZeptoMail SMTP Environment check ===');
  console.log('Host: smtp.zeptomail.eu');
  console.log('Port: 587 (STARTTLS)');
  console.log(
    'EMAIL_PASS / ZEPTOMAIL_TOKEN:',
    process.env.EMAIL_PASS || process.env.ZEPTOMAIL_TOKEN ? 'present' : 'MISSING',
  );
  console.log(
    'Token length:',
    (process.env.EMAIL_PASS || process.env.ZEPTOMAIL_TOKEN)?.length ?? 'missing',
  );
  console.log('Token starts with:', (process.env.EMAIL_PASS || process.env.ZEPTOMAIL_TOKEN)?.substring(0, 10) ?? 'missing');
  console.log('FROM:', `${FROM_NAME} <${FROM_EMAIL}>`);
  console.log('=======================================');
}

logEnvStatus();

export async function sendMailWithDebug(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  console.log('Preparing to send via ZeptoMail SMTP:');
  console.log('From:', `${FROM_NAME} <${FROM_EMAIL}>`);
  console.log('To:', to);
  console.log('Subject:', subject);

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    // Optional: add plain text fallback (improves deliverability)
    text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  };

  const start = Date.now();

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    const duration = Date.now() - start;
    console.log(`Email sent in ${duration} ms`);
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);

    // Nodemailer doesn't give a ZeptoMail-style request_id, but messageId is useful
    return {
      success: true,
      requestId: info.messageId || 'smtp-' + Date.now(),
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error('=== ZeptoMail SMTP send FAILED ===');
    console.error('Duration:', `${duration} ms`);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.response) {
      console.error('SMTP response:', error.response);
    }
    if (error.stack) {
      console.error('Stack:', error.stack.substring(0, 800));
    }

    return {
      success: false,
      error: error.message || 'SMTP send error',
    };
  }
}

export async function sendVerificationEmail(to: string, verificationToken: string) {
  const verificationUrl =
    `${process.env.VITE_APP_URL || 'http://localhost:8888'}/verify-email?token=${verificationToken}`;

  const html = `
    <h1>Welcome!</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verificationUrl}">Verify Email</a>
    <p>If you didn’t register, please ignore this email.</p>
  `;

  return sendMailWithDebug(to, 'Verify Your Email Address', html);
}

export async function sendResetPasswordEmail(to: string, resetToken: string) {
  const resetUrl =
    `${process.env.VITE_APP_URL || 'http://localhost:8888'}/confirm-reset-password?token=${resetToken}`;

  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password. Click the link below to set a new password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link will expire in 1 hour. If you didn’t request a password reset, please ignore this email.</p>
  `;

  return sendMailWithDebug(to, 'Reset Your Password', html);
}

export async function sendEmailChangeNotification(oldEmail: string, newEmail: string) {
  const html = `
    <h1>Email Address Change Notification</h1>
    <p>The email address associated with your account has been changed to <strong>${newEmail}</strong>.</p>
    <p>If you initiated this change, no further action is required. If you did not request this change, please contact support immediately at <a href="mailto:support@dotasks.app">support@dotasks.app</a>.</p>
    <p>Thank you,<br>Do Tasks App Team</p>
  `;

  return sendMailWithDebug(
    oldEmail,
    'Your Email Address Has Been Changed',
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

  return sendMailWithDebug(to, 'Your Password Has Been Changed', html);
}