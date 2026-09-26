// ---------------------------------------------------------------------------
// Fan Hub Plus — list paging and search parameters
//
// The admin console used to fetch the first LIST_LIMIT rows and stop, which
// meant an admin could not reach an older entry at all. Paging and search live
// in the URL (`?tab=content&q=gojo&page=3`) for the same reason `?tab=` does:
// the view is shareable, the back button behaves, and a reloaded page shows what
// you were looking at rather than resetting to page one.
// ---------------------------------------------------------------------------

/** Rows per page. These are tall cards with two buttons, not table lines. */
export const PAGE_SIZE = 25;

export type ListParams = {
  /** The raw, trimmed term, for echoing back into the search box. */
  q: string;
  /**
   * The term cleaned for a WHERE clause, or undefined when the box is empty.
   * Undefined rather than "" matters: `contains: ""` matches every row, which is
   * correct, but it also defeats the index and reads as a filter that is set.
   */
  term: string | undefined;
  /** One-based, already clamped to at least 1. */
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Longest term accepted, matching the search box's maxLength. */
const MAX_TERM = 80;

/**
 * SQLite's LIKE treats % and _ as wildcards, and Prisma offers no ESCAPE clause,
 * so a search for "100%" would otherwise match every price ending in digits. The
 * characters are dropped instead: a slightly narrower result beats a silently
 * wrong one. LIKE is case-insensitive for ASCII in SQLite, so `contains`
 * behaves case-insensitively for English titles without any extra work; accented
 * characters are case-sensitive, which is a known limit of the database, not of
 * this query.
 */
export function likeTerm(raw: string | undefined): string | undefined {
  const term = (raw ?? "").trim().replace(/[%_]/g, "").slice(0, MAX_TERM);
  return term.length > 0 ? term : undefined;
}

/** Reads `?q=` and `?page=` into something the loaders can use directly. */
export function readListParams(params: {
  q?: string | string[];
  page?: string | string[];
}): ListParams {
  // Capped as well as cleaned: the box echoes this value back, and an echoed
  // 5,000-character URL is a nuisance that the input would have prevented.
  const q = (firstValue(params.q) ?? "").trim().slice(0, MAX_TERM);
  const parsedPage = Number.parseInt(firstValue(params.page) ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return {
    q,
    term: likeTerm(q),
    page,
    pageSize: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  };
}

/** Builds the href for a page change, preserving the tab and the search term. */
export function pageHref(
  tab: string,
  params: { q?: string; page?: number }
): string {
  const search = new URLSearchParams({ tab });
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  return `/admin?${search.toString()}`;
}

export type PageWindow = {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
};

/** Clamps a requested page to the last page that actually has rows. */
export function resolveWindow(
  requested: ListParams,
  total: number
): PageWindow {
  const pageCount = Math.max(1, Math.ceil(total / requested.pageSize));
  const page = Math.min(requested.page, pageCount);
  return {
    page,
    pageCount,
    from: total === 0 ? 0 : (page - 1) * requested.pageSize + 1,
    to: Math.min(page * requested.pageSize, total),
    total,
  };
}
