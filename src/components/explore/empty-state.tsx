// ---------------------------------------------------------------------------
// Fan Hub Plus — explorer empty state
// Shown when a filter combination returns zero results. Reminds the visitor
// how to recover and offers a one-click clean slate.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-rose-200 px-6 py-16 text-center dark:border-rose-500/30">
      <SearchX className="size-10 text-primary/70" aria-hidden="true" />
      <div>
        <h3 className="font-heading text-lg font-semibold">
          No content matches those filters
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Try a wider search{query ? ` for “${query}”` : ""} or clear a few
          filters to see more of the catalogue.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/explore">Browse everything</Link>
      </Button>
    </div>
  );
}