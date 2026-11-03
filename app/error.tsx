'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/** Route-level error boundary: never leaks a stack trace to the visitor. */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    // Server-side logging happens where the error is thrown; here we only keep
    // the digest for correlation.
    if (error.digest) console.error('[rayane] route error digest:', error.digest);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <AlertTriangle aria-hidden="true" className="mx-auto size-9 text-warning" />
        <h1 className="mt-3 text-xl">{t.errors.serverTitle}</h1>
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">{t.errors.serverBody}</p>
        {error.digest && <p className="mt-2 font-mono text-2xs text-ink-300">ref: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
          >
            {t.common.retry}
          </button>
          <Link
            href="/"
            className="rounded-full border border-sand-300 px-5 py-2.5 text-sm font-medium text-ink-700 hover:border-gold-400"
          >
            {t.errors.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
