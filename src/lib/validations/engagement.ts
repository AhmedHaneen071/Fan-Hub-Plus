// ---------------------------------------------------------------------------
// Fan Hub Plus — engagement validation types
// Shared target list for the bookmark table's "one of three" polymorphism.
// ---------------------------------------------------------------------------

export const BOOKMARK_TARGETS = ["content", "character", "merchandise"] as const;

export type BookmarkTarget = (typeof BOOKMARK_TARGETS)[number];