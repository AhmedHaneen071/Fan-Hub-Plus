// Loading skeleton for the profile page.

import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}