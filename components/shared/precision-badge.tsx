'use client';

import { CheckCircle2, CircleDashed, MapPin, MapPinned } from 'lucide-react';
import type { CoordinatePrecision } from '@/types';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';

/**
 * Coordinate precision, always shown next to a location.
 *
 * This is a trust feature, not decoration: a user must be able to tell whether
 * a marker is the exact address, a neighbourhood, or only the commune.
 */
const CONF = {
  exact: { icon: CheckCircle2, tone: 'success' as const },
  approximate: { icon: MapPinned, tone: 'warning' as const },
  commune: { icon: MapPin, tone: 'neutral' as const },
  pending: { icon: CircleDashed, tone: 'outline' as const },
};

export function PrecisionBadge({
  precision,
  short = false,
}: {
  precision: CoordinatePrecision;
  short?: boolean;
}) {
  const { t } = useI18n();
  const { icon: Icon, tone } = CONF[precision];
  const label = short ? t.labels.precisionShort[precision] : t.labels.precision[precision];
  return (
    <Badge tone={tone} title={t.labels.precision[precision]}>
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </Badge>
  );
}
