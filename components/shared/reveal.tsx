'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Scroll reveal with a progressive-enhancement contract:
 * content is visible by default (no JS, reduced motion, or a crawler all see it)
 * and only animates in when IntersectionObserver reports it entering the
 * viewport. Never hide content behind an animation that might not run.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setShown(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(shown && 'animate-fade-up', className)}
    >
      {children}
    </Tag>
  );
}
