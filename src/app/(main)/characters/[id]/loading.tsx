// Loading skeleton for a character profile.

import { Skeleton } from "@/components/ui/skeleton";

export default function CharacterDetailLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading character">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <Skeleton className="aspect-square w-full rounded-2xl lg:col-span-2" />
        <div className="space-y-4 lg:col-span-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}