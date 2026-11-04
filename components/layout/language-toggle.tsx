'use client';

import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * FR / AR switch. Shows both options with the active one highlighted: a plain
 * toggle hides which language you landed in, which matters on a bilingual site.
 */
export function LanguageToggle({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { locale, setLocale, t } = useI18n();
  const onDark = variant === 'dark';

  return (
    <div
      role="group"
      aria-label={`${t.common.language} : ${locale === 'fr' ? 'Français' : 'العربية'}`}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full p-0.5',
        onDark ? 'bg-white/10 ring-1 ring-white/20' : 'bg-sand-200/70',
      )}
    >
      <Languages
        aria-hidden="true"
        className={cn('mx-1.5 size-3.5', onDark ? 'text-white/55' : 'text-ink-400')}
      />
      <button
        type="button"
        onClick={() => setLocale('fr')}
        aria-pressed={locale === 'fr'}
        lang="fr"
        className={cn(
          'rounded-full px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.08em] transition-colors',
          locale === 'fr'
            ? onDark
              ? 'bg-white text-ink-900'
              : 'bg-white text-ink-900 shadow-sm'
            : onDark
              ? 'text-white/70 hover:text-white'
              : 'text-ink-500 hover:text-ink-800',
        )}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLocale('ar')}
        aria-pressed={locale === 'ar'}
        lang="ar"
        className={cn(
          'rounded-full px-2.5 py-1 text-2xs font-semibold transition-colors',
          locale === 'ar'
            ? onDark
              ? 'bg-white text-ink-900'
              : 'bg-white text-ink-900 shadow-sm'
            : onDark
              ? 'text-white/70 hover:text-white'
              : 'text-ink-500 hover:text-ink-800',
        )}
      >
        العربية
      </button>
    </div>
  );
}
