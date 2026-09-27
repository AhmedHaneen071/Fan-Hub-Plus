import { Skeleton } from "@/components/ui/skeleton";

export default function ArticlesLoading() {
  return <div className="space-y-8" aria-label="Loading articles"><Skeleton className="h-5 w-32" /><Skeleton className="h-10 w-72" /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-72 rounded-2xl" />)}</div></div>;
}
