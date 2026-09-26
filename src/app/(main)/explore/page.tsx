// ---------------------------------------------------------------------------
// Fan Hub Plus — Content Explorer  (/explore)
//
// Server component. Reads the URL (?category, ?type, ?genre, ?year,
// ?minPopularity, ?q, ?sort, ?page), validates it with Zod, then runs ONE
// Prisma query. All filtering is done in the database — no client-side data
// wrangling.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { FilterForm } from "@/components/explore/filter-form";
import { ContentCard } from "@/components/explore/content-card";
import { EmptyState } from "@/components/explore/empty-state";
import { Pagination } from "@/components/explore/pagination";
import {
  normalizeSearchParams,
  parseExploreParams,
} from "@/lib/validations/explore";
import {
  getAvailableYears,
  getExploreResults,
} from "@/lib/queries/content";
import { CATEGORY_LABELS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Explore content",
  description: "Browse Fan Hub Plus content by fandom, genre, year and popularity.",
};

type ExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const rawParams = await searchParams;
  const normalized = normalizeSearchParams(rawParams);
  const filters = parseExploreParams(normalized);
  const search = new URLSearchParams(
    Object.entries(normalized).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  ).toString();

  const [results, yearOptions] = await Promise.all([
    getExploreResults(filters),
    getAvailableYears(),
  ]);

  const categoryLabel = filters.category
    ? CATEGORY_LABELS[filters.category]
    : null;

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Explore" }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
          {filters.q ? `Results for “${filters.q}”` : "Explore the catalogue"}
        </h1>
        <p className="text-muted-foreground">
          {results.total} items
          {categoryLabel ? ` · ${categoryLabel}` : ""}
          {filters.type ? ` · ${filters.type.toLowerCase()}` : ""}
          {filters.genre ? ` · ${filters.genre}` : ""}
        </p>
      </header>

      <FilterForm
        initialFilters={filters}
        search={search}
        yearOptions={yearOptions}
      />

      {results.items.length === 0 ? (
        <EmptyState query={filters.q ?? ""} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <Pagination search={search} page={results.page} pageCount={results.pageCount} />
    </div>
  );
}