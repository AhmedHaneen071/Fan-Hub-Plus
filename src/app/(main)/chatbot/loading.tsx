// Loading skeleton for the chatbot page.

import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";

export default function ChatbotLoading() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-5">
      <div className="space-y-8 lg:col-span-3">
        <Breadcrumbs crumbs={[{ label: "Ask the hub" }]} />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[26rem] w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
      <div className="space-y-4 lg:col-span-2 lg:pt-24">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  );
}