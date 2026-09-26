// Loading skeleton for the merchandise showroom.

import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";

export default function MerchLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading showroom">
      <Breadcrumbs crumbs={[{ label: "Merchandise" }]} />
      <Skeleton className="h-10 w-56" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}