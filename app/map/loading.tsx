import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading shell for the map page.
 *
 * Deliberately placed on a *leaf* route. It is not defined at the app root or on
 * a segment that has a dynamic child with `notFound()`: a `loading.tsx` there
 * wraps the child in a Suspense boundary, which flushes a 200 before the child can
 * set its own status, turning a missing listing into a soft 404. See
 * docs/IMPLEMENTATION_REPORT.md §Corrections for the diagnosis.
 *
 * The map page justifies a skeleton because it loads the Leaflet bundle.
 */
export default function MapLoading() {
  return (
    <div className="container-page py-12">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <Skeleton className="mt-8 h-[60vh] min-h-[420px] w-full rounded-2xl" />
    </div>
  );
}
