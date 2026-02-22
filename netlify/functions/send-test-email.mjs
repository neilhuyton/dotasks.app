// netlify/functions/send-test-email.mjs
import nodemailer from 'nodemailer';

export default async function handler(request) {
  // Allow GET for quick browser testing, POST for real calls
  if (!['GET', 'POST'].includes(request.method)) {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.zeptomail.eu',
    port: 587,
    secure: false,                    // STARTTLS on 587
    auth: {
      user: 'emailapikey',
      pass: process.env.ZEPTOMAIL_TOKEN,
    },
    // Helpful timeouts to avoid hangs in serverless
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    // Optional: logger + debug for prod troubleshooting
    logger: true,
    debug: process.env.NODE_ENV !== 'production',
  });

  // Quick connection check (optional but gold for debugging)
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
  } catch (err) {
    console.error('SMTP verify failed:', err.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'SMTP connection failed',
        details: err.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const mailOptions = {
    from: '"Do Tasks App" <noreply@dotasks.app>',
    to: 'hi@nehu.me',          // ← change this to whatever inbox you want to test
    subject: 'Prod SMTP Test – Modern Version',
    html: `
      <h1>Modern Nodemailer Test from Netlify Prod</h1>
      <p>Sent at: ${new Date().toISOString()}</p>
      <p>If you're reading this → SMTP works in production 🔥</p>
      <p>Using: Node ${process.version}, Nodemailer latest</p>
    `,
    // text: 'Plain text fallback if needed'
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email queued and accepted by ZeptoMail SMTP',
        messageId: info.messageId,
        response: info.response,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send failed:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack?.slice(0, 400),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}