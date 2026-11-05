import '@/lib/server/guard';
import { notificationRecipients } from '@/lib/db/admin-users';
import { emailDeliveryConfigured, sendEmail } from './email';

/** Delivery failures never roll back a customer inquiry or reservation. They are
 * logged without message contents, tokens or credentials. */
export async function notifyAdministrators(kind: 'inquiry' | 'reservation', subject: string, text: string): Promise<void> {
  if (!emailDeliveryConfigured()) return;
  const recipients = notificationRecipients(kind);
  await Promise.all(recipients.map(async (recipient) => {
    try { await sendEmail({ to: recipient.notificationEmail as string, subject, text }); }
    catch (error) { console.error(`[notifications] ${kind} delivery failed for account ${recipient.id}: ${(error as Error).message}`); }
  }));
}
