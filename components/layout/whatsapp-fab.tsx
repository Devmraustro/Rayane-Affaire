'use client';

import { MessageCircle, Phone } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PHONE_NUMBER, WHATSAPP_NUMBER } from '@/lib/config';

/**
 * Floating contact affordance.
 *
 * Rendered only when a real number is configured. With placeholder/absent
 * contact details we deliberately render nothing rather than shipping a dead
 * `wa.me/213000000000` button — the requirement forbids placeholder numbers.
 */
export function ContactFab() {
  const { t } = useI18n();
  if (!WHATSAPP_NUMBER && !PHONE_NUMBER) return null;

  return (
    <div className="fixed bottom-5 end-5 z-30 flex flex-col items-end gap-2">
      {WHATSAPP_NUMBER && (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.contact.whatsapp}
          className="group inline-flex items-center gap-2 rounded-full bg-[#128C7E] px-4 py-3 text-sm font-semibold text-white shadow-panel transition-transform hover:scale-[1.03]"
        >
          <MessageCircle aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">{t.contact.whatsapp}</span>
        </a>
      )}
      {PHONE_NUMBER && (
        <a
          href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}
          aria-label={t.contact.phone}
          className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-panel transition-transform hover:scale-[1.03]"
        >
          <Phone aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">{t.contact.phone}</span>
        </a>
      )}
    </div>
  );
}
