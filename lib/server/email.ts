import '@/lib/server/guard';

export class EmailError extends Error { constructor(message: string) { super(message); } }

export function emailDeliveryConfigured(): boolean {
  return (
    (process.env.EMAIL_DELIVERY === 'resend' &&
      Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)) ||
    (process.env.EMAIL_DELIVERY === 'console' && process.env.NODE_ENV !== 'production')
  );
}

/** Minimal transactional-email adapter. No credentials are persisted or exposed
 * to the browser. `console` is an explicit local-development backend only. */
export async function sendEmail(input: { to: string; subject: string; text: string }, fetcher: typeof fetch = fetch): Promise<void> {
  const backend = process.env.EMAIL_DELIVERY;
  if (backend === 'console' && process.env.NODE_ENV !== 'production') {
    console.info(`[local email] to=${input.to} subject=${input.subject}\n${input.text}`);
    return;
  }
  if (backend !== 'resend') throw new EmailError('Email delivery is not configured.');
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new EmailError('RESEND_API_KEY and EMAIL_FROM are required.');
  let response: Response;
  try {
    response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}) }),
      cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
  } catch { throw new EmailError('The email provider could not be reached.'); }
  if (!response.ok) throw new EmailError(`Email provider returned HTTP ${response.status}.`);
}
