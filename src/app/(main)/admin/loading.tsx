// Loading skeleton for the admin console.

import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";

export default function AdminLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading admin console">
      <Breadcrumbs crumbs={[{ label: "Admin" }]} />
      <Skeleton className="h-10 w-64" />
      <div className="flex gap-1">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-t-lg" />
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}