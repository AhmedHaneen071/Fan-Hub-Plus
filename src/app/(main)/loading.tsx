// Homepage loading skeleton — mirrors the Prime-style hero + lane layout.

import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div aria-busy="true" aria-label="Loading homepage">
      <div className="h-[62vh] min-h-[480px] w-full bg-gradient-to-br from-rose-800 via-background to-rose-200" />
      <div className="mx-auto w-full max-w-7xl space-y-14 px-4 py-12 sm:px-6">
        <div className="flex gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-32 rounded-full" />
          ))}
        </div>
        {Array.from({ length: 3 }, (_, laneIndex) => (
          <div key={laneIndex} className="space-y-3">
            <Skeleton className="h-8 w-56" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="aspect-[16/9] w-64 shrink-0 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}