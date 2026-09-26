// Loading skeleton for the content detail page (Prime-style hero + lane).

import { Skeleton } from "@/components/ui/skeleton";

export default function ContentDetailLoading() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading content">
      <Skeleton className="h-4 w-52" />
      <div className="relative h-[520px] w-full overflow-hidden rounded-3xl bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-card to-accent/10" />
        <div className="relative grid h-full grid-cols-1 content-center gap-8 p-10 lg:grid-cols-5">
          <Skeleton className="aspect-video w-full rounded-2xl lg:col-span-2" />
          <div className="space-y-4 lg:col-span-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-14 w-3/4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-44" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-[16/9] w-64 shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}