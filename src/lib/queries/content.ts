// ---------------------------------------------------------------------------
// Fan Hub Plus — content queries (explorer + detail + related)
// Kept separate from the page components so pages stay readable and the same
// helpers can be reused (e.g. related-content section).
// ---------------------------------------------------------------------------

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EXPLORE_PAGE_SIZE,
  CATEGORY_LABELS,
  CategoryValue,
  GENRES,
  type ContentTypeValue,
} from "@/lib/constants";
import type { ExploreFilters } from "@/lib/validations/explore";

// Shape understood by every content card on the site (grid + lanes + hero).
export type ContentCardItem = {
  id: string;
  title: string;
  type: ContentTypeValue;
  genre: string | null;
  description: string;
  release_date: Date | null;
  popularity_score: number;
  media_url: string | null;
  backdrop_url: string | null;
  category?: { name: CategoryValue; cover_image?: string | null };
  ratingAvg?: number | null;
  ratingCount?: number;
};

type ContentRow = {
  id: string;
  title: string;
  type: "ARTICLE" | "VIDEO" | "AUDIO" | "IMAGE";
  genre: string | null;
  description: string;
  release_date: Date | null;
  popularity_score: number;
  media_url: string | null;
  category?: { name: CategoryValue; cover_image?: string | null } | null;
  ratings?: { value: number }[];
};

const CARD_SELECT = {
  id: true,
  title: true,
  type: true,
  genre: true,
  description: true,
  release_date: true,
  popularity_score: true,
  media_url: true,
  category: { select: { name: true, cover_image: true } },
  ratings: {
    where: { ratingType: "STARS" },
    select: { value: true },
  },
} satisfies Prisma.ContentSelect;

// Maps a row into the card shape; the wide "backdrop" falls back to the
// fandom's cover art so every card reads as a Prime-style landscape poster.
export function toContentCards(rows: ContentRow[]): ContentCardItem[] {
  return rows.map(({ ratings, category, ...item }) => ({
    ...item,
    backdrop_url: item.media_url ?? category?.cover_image ?? null,
    category: category ?? undefined,
    ratingAvg:
      ratings && ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length
        : null,
    ratingCount: ratings?.length ?? 0,
  }));
}

// Lightweight shape used by cards; types stay server-inferred.
export async function getExploreResults(filters: ExploreFilters) {
  const { q, category, type, genre, year, minPopularity, sort, page } = filters;

  // SQLite's LIKE is case-insensitive for ASCII, so no "mode" flag is needed.
  const where: Prisma.ContentWhereInput = {
    AND: [
      category ? { category: { name: category as CategoryValue } } : {},
      type ? { type } : {},
      genre ? { genre } : {},
      year
        ? {
            release_date: {
              gte: new Date(year, 0, 1),
              lt: new Date(year + 1, 0, 1),
            },
          }
        : {},
      minPopularity !== undefined
        ? { popularity_score: { gte: minPopularity } }
        : {},
      q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {},
    ],
  };

  const orderBy: Prisma.ContentOrderByWithRelationInput =
    sort === "alpha"
      ? { title: "asc" }
      : sort === "latest"
        ? { release_date: "desc" }
        : sort === "popular"
          ? { popularity_score: "desc" }
          : { popularity_score: "desc" };

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy,
      skip: (page - 1) * EXPLORE_PAGE_SIZE,
      take: EXPLORE_PAGE_SIZE,
      select: CARD_SELECT,
    }),
    prisma.content.count({ where }),
  ]);

  return {
    items: toContentCards(items),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE)),
  };
}

// Distinct release years present in the catalogue, newest first, used to
// populate the "year" filter without hard-coding dates.
export async function getAvailableYears(): Promise<number[]> {
  const rows = await prisma.content.findMany({
    where: { release_date: { not: null } },
    select: { release_date: true },
  });
  const years = new Set<number>();
  for (const row of rows) {
    if (row.release_date) years.add(row.release_date.getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

// Genres present in the catalogue (sorted) for the genre filter dropdown.
export async function getAvailableGenres(): Promise<string[]> {
  const rows = await prisma.content.findMany({
    where: { genre: { not: null } },
    select: { genre: true },
    distinct: ["genre"],
  });
  const available = new Set(rows.map((row) => row.genre as string));
  // Follow the curated GENRES order, then any extra genres alphabetically.
  const ordered: string[] = GENRES.filter((genre) => available.has(genre));
  const extras = [...available].filter((genre) => !ordered.includes(genre)).sort();
  return [...ordered, ...extras];
}

// Detail page + related content in a single helper so the page stays thin.
export async function getContentDetail(id: string) {
  return prisma.content.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, cover_image: true } },
      bookmarks: { select: { id: true }, take: 1 },
    },
  });
}

export async function getRelatedContent(
  contentId: string,
  categoryId: string,
  limit = 4,
) {
  const items = await prisma.content.findMany({
    where: {
      AND: [
        { category_id: categoryId },
        { id: { not: contentId } },
      ],
    },
    orderBy: { popularity_score: "desc" },
    take: limit,
    select: CARD_SELECT,
  });

  return toContentCards(items);
}

// ---- Homepage feed ---------------------------------------------------------
// Prime-style shelf model: a hero of popular items plus horizontal "lanes"
// (trending, freshest, then one per featured fandom).
export type HomeFeed = {
  hero: ContentCardItem[];
  trending: ContentCardItem[];
  latest: ContentCardItem[];
  categoryLanes: {
    categoryId: string;
    categoryName: CategoryValue;
    categoryLabel: string;
    coverImage: string | null;
    items: ContentCardItem[];
  }[];
  categories: {
    name: CategoryValue;
    label: string;
    count: number;
    featured: boolean;
  }[];
};

const LANE_LIMIT = 10;
const HERO_LIMIT = 6;

export async function getHomeFeed(): Promise<HomeFeed> {
  const [hero, trending, latest, categories, lanes] = await Promise.all([
    prisma.content.findMany({
      orderBy: [{ popularity_score: "desc" }, { release_date: "desc" }],
      take: HERO_LIMIT,
      select: CARD_SELECT,
    }),
    prisma.content.findMany({
      orderBy: [{ popularity_score: "desc" }, { release_date: "desc" }],
      take: LANE_LIMIT + 3,
      select: CARD_SELECT,
    }),
    prisma.content.findMany({
      orderBy: [{ release_date: "desc" }, { popularity_score: "desc" }],
      take: LANE_LIMIT + 3,
      select: CARD_SELECT,
    }),
    prisma.category.findMany({
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        featured: true,
        _count: { select: { contents: true } },
      },
    }),
    prisma.category.findMany({
      where: { featured: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        cover_image: true,
        contents: {
          orderBy: [{ popularity_score: "desc" }, { release_date: "desc" }],
          take: 6,
          select: CARD_SELECT,
        },
      },
    }),
  ]);

  return {
    hero: toContentCards(hero),
    trending: toContentCards(trending),
    latest: toContentCards(latest),
    categoryLanes: lanes.map((lane) => ({
      categoryId: lane.id,
      categoryName: lane.name as CategoryValue,
      categoryLabel: CATEGORY_LABELS[lane.name as CategoryValue],
      coverImage: lane.cover_image,
      items: toContentCards(lane.contents),
    })),
    categories: categories.map(({ _count, ...category }) => ({
      ...category,
      name: category.name as CategoryValue,
      label: CATEGORY_LABELS[category.name as CategoryValue],
      count: _count.contents,
    })),
  };
}