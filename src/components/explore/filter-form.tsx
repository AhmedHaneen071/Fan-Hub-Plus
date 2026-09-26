// ---------------------------------------------------------------------------
// Fan Hub Plus — explorer filter bar (client)
//
// Filters are applied by writing them to the URL (?category=ANIME&year=2024),
// so every result set can be shared, bookmarked, and restored by the browser
// back button. React Hook Form + the same Zod schema used on the server keep
// the client and server validation in agreement.
// ---------------------------------------------------------------------------

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  exploreFormSchema,
  type ExploreFilters,
  type ExploreFormValues,
} from "@/lib/validations/explore";
import {
  CATEGORY_LABELS,
  CATEGORY_NAMES,
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  GENRES,
  POPULARITY_TIERS,
  SORT_LABELS,
  SORTS,
  type CategoryValue,
  type ContentTypeValue,
} from "@/lib/constants";
import { removeSearchParam, firstPageSearch } from "@/lib/explorer-url";

type FilterFormProps = {
  initialFilters: ExploreFilters;
  search: string; // raw query string (no "?"), for building chip links
  yearOptions: number[]; // distinct release years for the year dropdown
};

type Chip = { label: string; param: string };

export function FilterForm({
  initialFilters,
  search,
  yearOptions,
}: FilterFormProps) {
  const router = useRouter();

  const { register, handleSubmit, control } = useForm<ExploreFormValues>({
    resolver: zodResolver(exploreFormSchema),
    defaultValues: {
      q: initialFilters.q ?? "",
      category: initialFilters.category ?? "",
      type: initialFilters.type ?? "",
      genre: initialFilters.genre ?? "",
      year: initialFilters.year ? String(initialFilters.year) : "",
      minPopularity: initialFilters.minPopularity
        ? (String(initialFilters.minPopularity) as "60" | "80")
        : "",
      sort: initialFilters.sort,
    },
  });

  const onSubmit = handleSubmit((values) => {
    const params = new URLSearchParams();
    const query = values.q.trim();
    if (query) params.set("q", query);
    if (values.category) params.set("category", values.category);
    if (values.type) params.set("type", values.type);
    if (values.genre) params.set("genre", values.genre);
    if (values.year) params.set("year", values.year);
    if (values.minPopularity) params.set("minPopularity", values.minPopularity);
    if (values.sort !== "popular") params.set("sort", values.sort);
    const next = params.toString();
    router.push(next ? `/explore?${next}` : "/explore");
  });

  // Chips reflect the CURRENT URL (props), not the still-unsaved form.
  const chips: Chip[] = [];
  if (initialFilters.q) chips.push({ label: `"${initialFilters.q}"`, param: "q" });
  if (initialFilters.category)
    chips.push({
      label: CATEGORY_LABELS[initialFilters.category],
      param: "category",
    });
  if (initialFilters.type)
    chips.push({
      label: CONTENT_TYPE_LABELS[initialFilters.type],
      param: "type",
    });
  if (initialFilters.genre)
    chips.push({ label: initialFilters.genre, param: "genre" });
  if (initialFilters.year) chips.push({ label: String(initialFilters.year), param: "year" });
  if (initialFilters.minPopularity) {
    const tier = POPULARITY_TIERS.find(
      (t) => t.value === String(initialFilters.minPopularity),
    );
    chips.push({
      label: tier?.label ?? `Popularity ${initialFilters.minPopularity}+`,
      param: "minPopularity",
    });
  }

  return (
    <Card className="border-rose-100 bg-card/80 dark:border-rose-500/20">
      <CardContent className="space-y-4 p-5">
        <form className="space-y-4" onSubmit={onSubmit} aria-label="Filter content">
          {/* Search row: always on top, spans the full width */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search titles & descriptions…"
              className="pl-9"
              {...register("q")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-category">Fandom</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    name={field.name}
                  >
                    <SelectTrigger id="filter-category">
                      <SelectValue placeholder="Any fandom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any fandom</SelectItem>
                      {CATEGORY_NAMES.map((name) => (
                        <SelectItem key={name} value={name}>
                          {CATEGORY_LABELS[name as CategoryValue]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-type">Format</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    name={field.name}
                  >
                    <SelectTrigger id="filter-type">
                      <SelectValue placeholder="Any format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any format</SelectItem>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CONTENT_TYPE_LABELS[type as ContentTypeValue]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={control}
              name="genre"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-genre">Genre</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    name={field.name}
                  >
                    <SelectTrigger id="filter-genre">
                      <SelectValue placeholder="Any genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any genre</SelectItem>
                      {GENRES.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={control}
              name="year"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-year">Release year</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    name={field.name}
                  >
                    <SelectTrigger id="filter-year">
                      <SelectValue placeholder="Any year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any year</SelectItem>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={control}
              name="minPopularity"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-popularity">Popularity</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    name={field.name}
                  >
                    <SelectTrigger id="filter-popularity">
                      <SelectValue placeholder="Any popularity" />
                    </SelectTrigger>
                    <SelectContent>
                      {POPULARITY_TIERS.map((tier) => (
                        <SelectItem key={tier.value} value={tier.value}>
                          {tier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={control}
              name="sort"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-sort">Sort</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    name={field.name}
                  >
                    <SelectTrigger id="filter-sort">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORTS.map((sort) => (
                        <SelectItem key={sort} value={sort}>
                          {SORT_LABELS[sort]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="submit" size="sm">
              <Search aria-hidden="true" />
              Apply filters
            </Button>
            {chips.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href="/explore">Clear all</Link>
              </Button>
            ) : null}
          </div>
        </form>

        {chips.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-2 border-t border-rose-100 pt-4 dark:border-rose-500/20"
            aria-label="Active filters"
          >
            <span className="text-xs font-medium text-muted-foreground">
              Active filters
            </span>
            {chips.map((chip) => {
              const href = removeSearchParam(search, chip.param);
              return (
                <Badge
                  key={chip.param}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {chip.label}
                  <Link
                    href={href ? `/explore${href}` : "/explore"}
                    className="rounded-sm p-1 transition-colors hover:bg-rose-100 dark:hover:bg-rose-500/20"
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </Link>
                </Badge>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              asChild
            >
              <Link href={firstPageSearch(search)} aria-label="Clear all filters">
                Clear all
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}