import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

/**
 * RAYANE AFFAIRE wordmark.
 *
 * The mark is drawn with CSS/SVG (no external asset) so it stays crisp at any
 * size and needs no network request. `variant` switches it for dark surfaces.
 */
export function Logo({
  variant = 'dark',
  showTagline = false,
  className,
  locale = 'fr',
}: {
  variant?: 'dark' | 'light';
  showTagline?: boolean;
  className?: string;
  locale?: 'fr' | 'ar';
}) {
  const onDark = variant === 'light';
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl',
          onDark ? 'bg-white/10 ring-1 ring-white/25' : 'bg-ink-900',
        )}
      >
        <span className="font-display text-[0.95rem] font-semibold tracking-[0.02em] text-gold-400">
          {BRAND.monogram}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-x-1.5 bottom-1.5 h-px bg-gradient-to-r from-gold-500/0 via-gold-400 to-gold-500/0"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[1.0625rem] font-semibold uppercase tracking-[0.12em]',
            onDark ? 'text-white' : 'text-ink-900',
          )}
        >
          {locale === 'ar' ? 'ريان أعمال' : BRAND.name}
        </span>
        {showTagline && (
          <span
            className={cn(
              'mt-1 text-2xs font-medium uppercase tracking-[0.22em]',
              onDark ? 'text-white/60' : 'text-gold-700',
            )}
          >
            {locale === 'ar' ? 'عقارات وسيارات' : 'Immobilier & Véhicules'}
          </span>
        )}
      </span>
    </span>
  );
}
