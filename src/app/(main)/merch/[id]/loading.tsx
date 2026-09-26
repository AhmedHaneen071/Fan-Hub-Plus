// Loading skeleton for a merchandise item page.

import { Skeleton } from "@/components/ui/skeleton";

export default function MerchDetailLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading item">
      <Skeleton className="h-4 w-56" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <Skeleton className="aspect-square w-full rounded-2xl lg:col-span-2" />
        <div className="space-y-4 lg:col-span-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}