// Loading skeleton for the events page.

import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";

export default function EventsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading events">
      <Breadcrumbs crumbs={[{ label: "Events" }]} />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-[420px] w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}