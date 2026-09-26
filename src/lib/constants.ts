// ---------------------------------------------------------------------------
// Fan Hub Plus — shared catalogue constants
// Used by the data layer (seed alignment, Prisma queries) and the UI layer
// (filter dropdowns, badges, breadcrumbs) so labels never drift apart.
// ---------------------------------------------------------------------------

// These must stay in sync with the Prisma enums (CategoryName, ContentType).
// The tuples power Zod enums and accept "Any" via the empty string "".

export const CATEGORY_NAMES = [
  "ANIME",
  "GAMING",
  "MOVIES",
  "TV_SHOWS",
  "KPOP",
  "COMICS",
  "MANGA",
  "COSPLAY",
] as const;

export type CategoryValue = (typeof CATEGORY_NAMES)[number];

export const CATEGORY_LABELS: Record<CategoryValue, string> = {
  ANIME: "Anime",
  GAMING: "Gaming",
  MOVIES: "Movies",
  TV_SHOWS: "TV Shows",
  KPOP: "K-pop",
  COMICS: "Comics",
  MANGA: "Manga",
  COSPLAY: "Cosplay",
};

export const CONTENT_TYPES = ["ARTICLE", "VIDEO", "AUDIO", "IMAGE"] as const;

export type ContentTypeValue = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentTypeValue, string> = {
  ARTICLE: "Article",
  VIDEO: "Video",
  AUDIO: "Audio",
  IMAGE: "Image",
};

// Genres used by the seed. The explorer filters on these; new genres created
// by admins in the future can be added here without a schema change.
export const GENRES = [
  "Action",
  "Adventure",
  "Art",
  "Comedy",
  "Community",
  "Dance",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Music",
  "Mystery",
  "Photography",
  "Pop",
  "Romance",
  "Tutorial",
] as const;

// Sort orders offered by the explorer. `popular` is the default view.
export const SORTS = ["popular", "latest", "alpha"] as const;

export type SortValue = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortValue, string> = {
  popular: "Most popular",
  latest: "Newest",
  alpha: "A–Z",
};

// Heat thresholds used by the "popularity" filter and the card badge.
export const POPULARITY_TIERS = [
  { value: "", label: "Any popularity" },
  { value: "60", label: "Hot (60+)" },
  { value: "80", label: "On fire (80+)" },
] as const;

export const EXPLORE_PAGE_SIZE = 12;