// ---------------------------------------------------------------------------
// Fan Hub Plus — explorer loading skeleton
// Shown instantly during client-side filter navigation so the page never
// flashes blank (falls nicely into the Phase 8 loading-spinner guidance).
// ---------------------------------------------------------------------------

import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading content">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}