// netlify/functions/send-email-background.ts

import { sendMailWithDebug } from '../../server/email';  // ← adjust this path if your folder structure is different

export default async (req: Request) => {
  console.log('Background function INVOKED at', new Date().toISOString());

  if (req.method !== 'POST') {
    console.warn('Method not allowed');
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
    console.log('Received body:', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Invalid JSON in background email request:', err);
    return new Response('Queued anyway', { status: 202 });
  }

  const { type, to: providedTo, token, oldEmail, newEmail } = body;
  let to: string = providedTo;

  if (!to || typeof to !== 'string') {
    console.error('Missing or invalid "to" in background email');
    return new Response('Queued anyway', { status: 202 });
  }

  let subject = '';
  let html = '';

  try {
    switch (type) {
      case 'verification': {
        if (typeof token !== 'string') throw new Error('Missing token');
        subject = 'Verify Your Email Address';
        const verificationUrl = `${process.env.VITE_APP_URL || 'http://localhost:8888'}/verify-email?token=${token}`;
        html = `<h1>Welcome!</h1><p>Please verify your email address by clicking the link below:</p><a href="${verificationUrl}">Verify Email</a><p>If you didn’t register, please ignore this email.</p>`;
        break;
      }

      case 'reset-password': {
        if (typeof token !== 'string') throw new Error('Missing token');
        subject = 'Reset Your Password';
        const resetUrl = `${process.env.VITE_APP_URL || 'http://localhost:8888'}/confirm-reset-password?token=${token}`;
        html = `<h1>Password Reset Request</h1><p>You requested to reset your password. Click the link below:</p><a href="${resetUrl}">Reset Password</a><p>This link will expire in 1 hour. If you didn’t request this, ignore.</p>`;
        break;
      }

      case 'email-change': {
        if (!oldEmail || !newEmail) throw new Error('Missing old/new email');
        subject = 'Your Email Address Has Been Changed';
        html = `<h1>Email Address Change Notification</h1><p>Your email has been changed to <strong>${newEmail}</strong>.</p><p>If you initiated this, no action needed. Otherwise, contact <a href="mailto:support@dotasks.app">support@dotasks.app</a>.</p><p>Thank you,<br>Do Tasks App Team</p>`;
        to = oldEmail;
        break;
      }

      case 'password-change': {
        subject = 'Your Password Has Been Changed';
        html = `<h1>Password Change Notification</h1><p>Your password was successfully updated.</p><p>If you did this, all good. If not, contact <a href="mailto:support@dotasks.app">support@dotasks.app</a> immediately.</p><p>Thank you,<br>Do Tasks App Team</p>`;
        break;
      }

      default: {
        throw new Error(`Unknown email type: ${type}`);
      }
    }

    console.log(`Background: Starting send for ${type} to ${to}`);

    const result = await sendMailWithDebug(to, subject, html).catch(err => {
      console.error(`sendMailWithDebug rejected for ${type}:`, err.message || err);
      return { success: false };
    });

    console.log(`Background: sendMailWithDebug completed for ${type}:`, result);

  } catch (err) {
    console.error('Background function crashed:', err);
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Email queued in background' }),
    { status: 202, headers: { 'Content-Type': 'application/json' } }
  );
};