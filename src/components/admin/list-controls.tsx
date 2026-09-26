// ---------------------------------------------------------------------------
// Fan Hub Plus — admin list controls (client)
//
// The search box and pager that sit above every paged manager. Both write to
// the URL rather than to component state: a search is then shareable, the back
// button undoes it, and a reload lands on the same page instead of resetting.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHref, type PageWindow } from "@/lib/list-params";

export function ListControls({
  tab,
  query,
  range,
  /** What to call the thing being searched, e.g. "titles and descriptions". */
  searchLabel,
}: {
  tab: string;
  query: string;
  /** Named `range` rather than `window` so it cannot shadow the global. */
  range: PageWindow;
  searchLabel: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      {/* Keyed on the applied query so the box re-seeds itself from the URL
          after a search, a Clear, or the back button — no effect and no
          setState-during-render needed. */}
      <SearchBox key={`${tab}:${query}`} tab={tab} query={query} searchLabel={searchLabel} />

      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {range.total === 0
            ? query
              ? `Nothing matches “${query}”.`
              : "Nothing here yet."
            : `Showing ${range.from}–${range.to} of ${range.total}`}
          {query && range.total > 0 ? ` for “${query}”` : ""}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={range.page <= 1}
            aria-label="Previous page"
            onClick={() => router.push(pageHref(tab, { q: query, page: range.page - 1 }))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-20 text-center text-xs text-muted-foreground">
            Page {range.page} of {range.pageCount}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={range.page >= range.pageCount}
            aria-label="Next page"
            onClick={() => router.push(pageHref(tab, { q: query, page: range.page + 1 }))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SearchBox({
  tab,
  query,
  searchLabel,
}: {
  tab: string;
  query: string;
  searchLabel: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(query);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        // A new search always starts at page one: page 4 of a term that now has
        // one page of results is an empty list with no obvious cause.
        router.push(pageHref(tab, { q: term.trim(), page: 1 }));
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`search-${tab}`} className="text-xs text-muted-foreground">
          Search {searchLabel}
        </Label>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={`search-${tab}`}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Type to filter…"
              className="w-56 pl-8"
              maxLength={80}
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
          {query ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => router.push(pageHref(tab, { q: "", page: 1 }))}
            >
              <X aria-hidden="true" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
