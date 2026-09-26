// Loading skeleton for the character hall of fame.

import { Skeleton } from "@/components/ui/skeleton";

export default function CharactersLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading characters">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-5 w-52" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}