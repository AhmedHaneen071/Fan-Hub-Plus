// ---------------------------------------------------------------------------
// Fan Hub Plus — explorer filter schemas (Zod)
//
// Two schemas are used here for one simple reason:
//  - exploreParamsSchema validates the EXPLORER URL (read on the server).
//    Values arrive as strings from the query string, so numbers are coerced.
//  - exploreFormSchema mirrors the hidden form fields (also strings, "" = any)
//    so React Hook Form + zodResolver share the exact same rules.
// ---------------------------------------------------------------------------

import { z } from "zod";
import {
  CATEGORY_NAMES,
  CONTENT_TYPES,
  GENRES,
  SORTS,
} from "@/lib/constants";

// "" is what an unselected (Any) <option> submits; treat it as "not set".
const optionalString = z.string().trim().max(120);
const categoryEnum = z.enum(CATEGORY_NAMES);
const typeEnum = z.enum(CONTENT_TYPES);
const genreEnum = z.enum(GENRES);
const sortEnum = z.enum(SORTS);

export const exploreParamsSchema = z
  .object({
    q: optionalString.optional(),
    category: z.preprocess((v) => (v === "" ? undefined : v), categoryEnum).optional(),
    type: z.preprocess((v) => (v === "" ? undefined : v), typeEnum).optional(),
    genre: z.preprocess((v) => (v === "" ? undefined : v), genreEnum).optional(),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    minPopularity: z.coerce.number().int().min(0).max(100).optional(),
    sort: z.preprocess((v) => (v === "" ? undefined : v), sortEnum).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  // Unknown query params (utm, etc.) are ignored, never fatal.
  .passthrough();

// The shape the explorer page actually consumes (defaults applied).
export type ExploreFilters = {
  q?: string;
  category?: (typeof CATEGORY_NAMES)[number];
  type?: (typeof CONTENT_TYPES)[number];
  genre?: (typeof GENRES)[number];
  year?: number;
  minPopularity?: number;
  sort: (typeof SORTS)[number];
  page: number;
};

// Form defaults + rules used by the client filter form.
export const exploreFormSchema = z.object({
  q: z.string().max(120),
  category: z.enum(["", ...CATEGORY_NAMES]),
  type: z.enum(["", ...CONTENT_TYPES]),
  genre: z.enum(["", ...GENRES]),
  year: z.string().max(4),
  minPopularity: z.enum(["", "60", "80"]),
  sort: sortEnum,
});

export type ExploreFormValues = z.infer<typeof exploreFormSchema>;

// Next.js gives us string | string[] | undefined; filters only need the
// first value if a duplicate key sneaks in.
export function normalizeSearchParams(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  return normalized;
}

// Parse the URL (already normalized) into safe, defaulted filters.
// Malformed values fall back to the default/"all" view instead of 500ing.
export function parseExploreParams(
  params: Record<string, string | undefined>,
): ExploreFilters {
  const safe = exploreParamsSchema.safeParse(params);
  if (!safe.success) {
    return { sort: "popular", page: 1 };
  }
  const { q, category, type, genre, year, minPopularity, sort, page } = safe.data;
  return {
    q,
    category,
    type,
    genre,
    year,
    minPopularity,
    sort: sort ?? "popular",
    page: page ?? 1,
  };
}

// Turn filters back into a clean query string (used by filter form + chips).
export function filtersToSearch(filters: ExploreFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.type) params.set("type", filters.type);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.year) params.set("year", String(filters.year));
  if (filters.minPopularity) params.set("minPopularity", String(filters.minPopularity));
  if (filters.sort && filters.sort !== "popular") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}