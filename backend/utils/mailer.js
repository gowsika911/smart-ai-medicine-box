/**
 * Sends email through Brevo's HTTPS API (free plan: 300 emails/day, no credit card).
 *
 * We use an HTTPS API on purpose: Render's free web services block the SMTP ports
 * (25, 465, 587), so Gmail/SMTP would silently fail once deployed.
 *
 * Environment variables:
 *   BREVO_API_KEY      - from Brevo -> SMTP & API -> API Keys
 *   MAIL_FROM_EMAIL    - the sender address you verified in Brevo
 *   MAIL_FROM_NAME     - optional, default "MedBox"
 *   BREVO_API_URL      - optional, only for tests
 *
 * sendMail never throws. It returns { sent: true } or { sent: false, reason }.
 */
const DEFAULT_URL = 'https://api.brevo.com/v3/smtp/email';
const TIMEOUT_MS = 15000;

function isMailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL);
}

async function sendMail({ to, subject, text, html }) {
  if (!isMailConfigured()) return { sent: false, reason: 'not-configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(process.env.BREVO_API_URL || DEFAULT_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: process.env.MAIL_FROM_NAME || 'MedBox', email: process.env.MAIL_FROM_EMAIL },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Mailer: provider returned ${response.status}`);
      return { sent: false, reason: `provider-${response.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('Mailer: could not send email:', err.name === 'AbortError' ? 'timeout' : err.message);
    return { sent: false, reason: err.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendMail, isMailConfigured };
