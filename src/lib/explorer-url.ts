// ---------------------------------------------------------------------------
// Fan Hub Plus — explorer URL helpers
// Filters live in the URL so views can be shared/bookmarked. These small
// helpers mutate a query string without touching React Router state.
// ---------------------------------------------------------------------------

import { EXPLORE_PAGE_SIZE } from "@/lib/constants";

/** Return the query string (leading "?") with one key removed. */
export function removeSearchParam(search: string, key: string): string {
  const params = new URLSearchParams(search);
  params.delete(key);
  return toSearch(params);
}

/** Return the query string with one key set. */
export function setSearchParam(
  search: string,
  key: string,
  value: string,
): string {
  const params = new URLSearchParams(search);
  if (value) params.set(key, value);
  else params.delete(key);
  return toSearch(params);
}

/** Return the query string with the page reset to 1 (used on filter change). */
export function firstPageSearch(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("page");
  return toSearch(params);
}

/** Return the query string pointing at a specific (clamped) page. */
export function pageSearch(search: string, page: number): string {
  const params = new URLSearchParams(search);
  params.set("page", String(Math.max(1, page)));
  return toSearch(params);
}

/** True when a filter produces an empty result set for this many items. */
export function pageCountFor(total: number): number {
  return Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE));
}

function toSearch(params: URLSearchParams): string {
  const value = params.toString();
  return value ? `?${value}` : "";
}

/** Human-readable page label shared by pagination and the result count. */
export function pageLabel(page: number, pageCount: number): string {
  return `Page ${page} of ${pageCount}`;
}