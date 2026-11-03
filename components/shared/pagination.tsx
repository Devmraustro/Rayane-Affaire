import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Server-rendered pagination.
 *
 * Renders real <a href> links (crawlable, works without JS, survives a hard
 * refresh) rather than button-driven state. Windowed to avoid 40 links on a
 * long catalogue.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  labels,
  rtl = false,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  labels: { previous: string; next: string; page: string; of: string };
  rtl?: boolean;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;

  const window: (number | 'gap')[] = [];
  const push = (n: number) => {
    if (!window.includes(n)) window.push(n);
  };
  push(1);
  if (page - 2 > 2) window.push('gap');
  for (let n = Math.max(2, page - 1); n <= Math.min(totalPages - 1, page + 1); n += 1) push(n);
  if (page + 2 < totalPages - 1) window.push('gap');
  if (totalPages > 1) push(totalPages);

  return (
    <nav
      aria-label={`${labels.page} ${page} ${labels.of} ${totalPages}`}
      className={cn('flex items-center justify-center gap-1.5', className)}
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          rel="prev"
          aria-label={labels.previous}
          className="grid size-10 place-items-center rounded-full border border-sand-300 bg-white text-ink-600 transition-colors hover:border-gold-400 hover:text-gold-700"
        >
          <Prev aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-full border border-sand-200 bg-sand-100 text-ink-300"
        >
          <Prev className="size-4" />
        </span>
      )}

      {window.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-ink-300" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'grid size-10 place-items-center rounded-full text-sm font-medium transition-colors',
              item === page
                ? 'bg-ink-900 text-white'
                : 'border border-sand-300 bg-white text-ink-600 hover:border-gold-400 hover:text-gold-700',
            )}
          >
            {item}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          rel="next"
          aria-label={labels.next}
          className="grid size-10 place-items-center rounded-full border border-sand-300 bg-white text-ink-600 transition-colors hover:border-gold-400 hover:text-gold-700"
        >
          <Next aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-full border border-sand-200 bg-sand-100 text-ink-300"
        >
          <Next className="size-4" />
        </span>
      )}
    </nav>
  );
}
