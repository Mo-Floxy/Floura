import nodemailer from 'nodemailer';

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export const mailConfigured = Boolean(transporter);

export async function sendMail({ to, subject, text, html }) {
  if (!transporter) return { sent: false, reason: 'Email delivery is not configured on this server.' };
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'FLOURA <no-reply@floura.app>',
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error('[floura:mail]', error.message);
    return { sent: false, reason: 'We could not deliver the email. Please try again.' };
  }
}
