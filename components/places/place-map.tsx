'use client';

import dynamic from 'next/dynamic';
import type { GeoPoint, PlaceCoordinatePrecision } from '@/types';
import { MapSkeleton } from '@/components/map/property-map';

export interface PlaceMapProps {
  point: GeoPoint | null;
  center: GeoPoint;
  precision: PlaceCoordinatePrecision;
  editable?: boolean;
  onChange?: (point: GeoPoint) => void;
  label: string;
  className?: string;
}

const Impl = dynamic(() => import('./place-map-impl').then((module) => module.PlaceMapImpl), {
  ssr: false,
  loading: () => <MapSkeleton className="h-[320px]" />,
});

export function PlaceMap(props: PlaceMapProps) { return <Impl {...props} />; }
