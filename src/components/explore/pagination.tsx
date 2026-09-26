// ---------------------------------------------------------------------------
// Fan Hub Plus — explorer pagination
// Server-rendered links so each page is real navigable content. Shows up to
// five numbered pages (with "…" gaps) plus Previous/Next.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageSearch } from "@/lib/explorer-url";

const MAX_VISIBLE = 5;

type PaginationProps = {
  search: string; // raw query string (no "?")
  page: number;
  pageCount: number;
};

function pageNumbers(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= MAX_VISIBLE) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const pages: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) pages.push("gap");
  for (let current = start; current <= end; current += 1) pages.push(current);
  if (end < pageCount - 1) pages.push("gap");
  pages.push(pageCount);
  return pages;
}

export function Pagination({ search, page, pageCount }: PaginationProps) {
  if (pageCount <= 1) return null;

  const numbers = pageNumbers(page, pageCount);
  const previous = page > 1 ? pageSearch(search, page - 1) : null;
  const next = page < pageCount ? pageSearch(search, page + 1) : null;

  return (
    <nav
      aria-label="Content pages"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {previous ? (
        <Button variant="outline" size="icon" asChild>
          <Link href={`/explore${previous}`} aria-label="Previous page">
            <ChevronLeft aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label="Previous page">
          <ChevronLeft aria-hidden="true" />
        </Button>
      )}

      {numbers.map((number, index) =>
        number === "gap" ? (
          <span
            key={`gap-${index}`}
            className="px-1 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <Button
            key={number}
            variant={number === page ? "default" : "outline"}
            size="icon"
            aria-current={number === page ? "page" : undefined}
            asChild
          >
            <Link href={`/explore${pageSearch(search, number)}`}>{number}</Link>
          </Button>
        ),
      )}

      {next ? (
        <Button variant="outline" size="icon" asChild>
          <Link href={`/explore${next}`} aria-label="Next page">
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label="Next page">
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </nav>
  );
}