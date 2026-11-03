import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Empty state. Used everywhere a real query returned nothing: the platform must
 * say "there is nothing yet" rather than invent content to look populated.
 */
export function EmptyState({
  title,
  body,
  icon: Icon = Inbox,
  action,
  tone = 'neutral',
  className,
}: {
  title: string;
  body?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  tone?: 'neutral' | 'inline';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        tone === 'neutral'
          ? 'rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-14'
          : 'px-4 py-8',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full bg-sand-100 text-ink-300"
      >
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink-800">{title}</h3>
      {body && <p className="mt-1.5 max-w-md text-sm leading-6 text-ink-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
