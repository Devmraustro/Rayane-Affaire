'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import type { MediaItem, Locale } from '@/types';
import { SmartImage } from './smart-image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Listing gallery.
 *
 * Mobile: a swipeable horizontal scroller with snap points (native momentum, no
 * JS carousel). Desktop: main image + thumbnail strip. A full-screen dialog is
 * available for detail inspection. Keyboard arrows work in both the strip and
 * the dialog; every image carries real alt text.
 */
export function ListingGallery({
  media,
  locale,
  labels,
  fallbackAlt,
}: {
  media: MediaItem[];
  locale: Locale;
  labels: { gallery: string; photos: string; noPhotos: string; previous: string; next: string; close: string };
  fallbackAlt: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const items = media.length ? media : [];
  const count = items.length;

  const go = React.useCallback(
    (delta: number) => setIndex((current) => (count ? (current + delta + count) % count : 0)),
    [count],
  );

  React.useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(locale === 'ar' ? -1 : 1);
      if (event.key === 'ArrowLeft') go(locale === 'ar' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomOpen, go, locale]);

  if (!count) {
    return (
      <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
        <SmartImage
          src={null}
          alt={labels.noPhotos}
          fill
          sizes="(max-width: 1024px) 92vw, 62vw"
          className="aspect-[16/10] w-full"
        />
      </div>
    );
  }

  const active = items[Math.min(index, count - 1)];
  const activeAlt = active.alt[locale] || active.alt.fr || fallbackAlt;

  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl border border-sand-200 bg-ink-950">
        <SmartImage
          src={active.url}
          alt={activeAlt}
          fill
          priority
          sizes="(max-width: 1024px) 92vw, 62vw"
          className="aspect-[16/10] w-full"
          imgClassName="object-cover"
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={labels.previous}
              className="absolute start-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-ink-950/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-ink-950/70 focus-visible:opacity-100 group-hover:opacity-100 rtl:rotate-180"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={labels.next}
              className="absolute end-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-ink-950/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-ink-950/70 focus-visible:opacity-100 group-hover:opacity-100 rtl:rotate-180"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-ink-950/55 px-2.5 py-1 text-2xs font-medium text-white backdrop-blur-sm">
            {index + 1} / {count} {labels.photos}
          </span>
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1.5 text-2xs font-semibold text-ink-800 transition-colors hover:bg-white"
          >
            <Expand aria-hidden="true" className="size-3" />
            {labels.gallery}
          </button>
        </div>

        {active.credit && (
          <p className="absolute end-3 top-3 max-w-[60%] rounded bg-ink-950/55 px-2 py-1 text-[0.625rem] leading-4 text-white/80 backdrop-blur-sm">
            {active.credit}
          </p>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-2.5 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label={labels.gallery}>
          {items.map((item, itemIndex) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(itemIndex)}
                aria-current={itemIndex === index}
                aria-label={`${labels.gallery} ${itemIndex + 1}`}
                className={cn(
                  'relative block h-16 w-24 overflow-hidden rounded-lg border-2 transition-all',
                  itemIndex === index
                    ? 'border-gold-500 opacity-100'
                    : 'border-transparent opacity-65 hover:opacity-100',
                )}
              >
                <SmartImage
                  src={item.url}
                  alt=""
                  fill
                  sizes="96px"
                  className="size-full"
                  imgClassName="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-5xl bg-ink-950 p-2 sm:p-3" closeLabel={labels.close}>
          <DialogTitle className="sr-only">{activeAlt}</DialogTitle>
          <div className="relative">
            <SmartImage
              src={active.url}
              alt={activeAlt}
              fill
              sizes="100vw"
              className="aspect-[16/10] w-full rounded-lg"
              imgClassName="object-contain"
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={labels.previous}
                  className="absolute start-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 rtl:rotate-180"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={labels.next}
                  className="absolute end-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 rtl:rotate-180"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center justify-between px-2 pb-1 pt-2 text-xs text-white/60">
            <span>
              {index + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="inline-flex items-center gap-1 hover:text-white"
            >
              <X aria-hidden="true" className="size-3.5" />
              {labels.close}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
