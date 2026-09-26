// Loading skeleton for the dashboard.

import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-80" />
      <div className="flex gap-1">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-t-lg" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}