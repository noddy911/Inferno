import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Real SMTP when configured; otherwise dev mode logs the message instead of sending.
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

/**
 * Send a password-reset email. In development (no SMTP configured) the reset
 * link is logged so the flow can still be tested end to end.
 * @param {string} to
 * @param {string} token
 */
export async function sendResetPasswordEmail(to, token) {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

  if (!transporter) {
    logger.info(`[email] (dev) password reset link for ${to}: ${resetUrl}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM || env.SMTP_USER,
      to,
      subject: 'Reset your password',
      text: `Use this link to reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
      html: `<p>Use <a href="${resetUrl}">this link</a> to reset your password. It expires in 1 hour.</p>`,
    });
    logger.info(`[email] reset email sent to ${to}`);
  } catch (err) {
    logger.error(`[email] failed to send reset email to ${to}: ${err.message}`);
  }
}

export default { sendResetPasswordEmail };
