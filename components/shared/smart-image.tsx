'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Image delivery wrapper.
 *
 *  * Falls back to a branded placeholder artwork when a listing has no photo or
 *    when the remote file 404s — a broken image never breaks a card layout.
 *  * Responsive `sizes` so the browser picks an appropriate width.
 *  * Lazy by default; pass `priority` for the hero (LCP) image only.
 *  * Behaves correctly with `fill` inside a fixed-aspect container.
 */

const FALLBACK = '/images/fallback/placeholder.svg';

export interface SmartImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Provide width/height for fixed layouts, or `fill` for aspect containers. */
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  fallback?: string;
}

export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  width,
  height,
  fill = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  fallback = FALLBACK,
}: SmartImageProps) {
  const [current, setCurrent] = React.useState(src || fallback);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setCurrent(src || fallback);
    setLoaded(false);
  }, [src, fallback]);

  const isSvg = current.endsWith('.svg');

  return (
    <span className={cn('relative block overflow-hidden bg-sand-200/60', className)}>
      {!loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-sand-200/70 to-sand-100"
        />
      )}
      <Image
        src={current}
        alt={alt}
        {...(fill ? { fill: true } : { width: width ?? 960, height: height ?? 640 })}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        unoptimized={isSvg}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (current !== fallback) {
            setCurrent(fallback);
          } else {
            setLoaded(true);
          }
        }}
        className={cn(
          'transition-opacity duration-500 ease-premium',
          fill ? 'object-cover' : 'h-auto w-full object-cover',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </span>
  );
}
