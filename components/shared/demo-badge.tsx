'use client';

import { FlaskConical } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Demonstration marker.
 *
 * Any record seeded for demonstration is labelled on the card, the detail page
 * and the map popup. The requirement is explicit: demonstration records must
 * never be presented as real client inventory. It is also excluded from every
 * statistic (see lib/db/stats.ts).
 */
export function DemoBadge({
  className,
  withTooltip = true,
}: {
  className?: string;
  withTooltip?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Badge
      tone="warning"
      className={cn('gap-1', className)}
      title={withTooltip ? t.common.demoNotice : undefined}
    >
      <FlaskConical aria-hidden="true" className="size-3" />
      {t.common.demoNotice.split(' — ')[0]}
    </Badge>
  );
}
