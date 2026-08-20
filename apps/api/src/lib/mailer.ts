import nodemailer from 'nodemailer';
import { config } from '../config';

/**
 * Transactional mail (email verification, password reset).
 * MAIL_HOST خالی باشد → لینک فقط در لاگ سرور چاپ می‌شود (dev mode).
 */
let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (transporter) return transporter;
  if (!config.mail.host) return null;
  transporter = nodemailer.createTransport({
    host: config.mail.host, port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const t = getTransport();
  if (!t) {
    console.log(`📧 [dev-mail] to=${to}\n   subject=${subject}\n${text}`);
    return;
  }
  await t.sendMail({ from: config.mail.from, to, subject, text });
}
