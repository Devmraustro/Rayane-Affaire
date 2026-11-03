import { Skeleton } from '@/components/ui/skeleton';

/** Global loading shell — keeps the layout stable while a route streams in. */
export default function Loading() {
  return (
    <div className="container-page py-12">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2.5 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
