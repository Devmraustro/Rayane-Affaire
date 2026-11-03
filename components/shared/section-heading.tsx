import Link from 'next/link';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Editorial section heading: eyebrow, display title, optional lede and link. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  action,
  align = 'start',
  tone = 'light',
  rtl = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: { href: string; label: string };
  align?: 'start' | 'center';
  tone?: 'light' | 'dark';
  rtl?: boolean;
  className?: string;
}) {
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
        {eyebrow && (
          <p className={cn('eyebrow', tone === 'dark' && 'text-gold-400')}>{eyebrow}</p>
        )}
        <h2
          className={cn(
            'mt-2.5 text-2xl sm:text-3xl lg:text-[2.125rem] lg:leading-[1.15]',
            tone === 'dark' && 'text-white',
          )}
        >
          {title}
        </h2>
        {lede && (
          <p
            className={cn(
              'mt-3 text-[0.9375rem] leading-relaxed',
              tone === 'dark' ? 'text-white/70' : 'text-ink-500',
            )}
          >
            {lede}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            'group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium transition-colors',
            tone === 'dark'
              ? 'text-gold-400 hover:text-gold-300'
              : 'text-gold-700 hover:text-gold-800',
          )}
        >
          {action.label}
          <Arrow
            aria-hidden="true"
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}
