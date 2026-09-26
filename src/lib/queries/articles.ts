// ---------------------------------------------------------------------------
// Fan Hub Plus — featured article queries
//
// Backs the public /articles section. The rich text is returned as stored;
// rendering it is the caller's job and must go through sanitizeArticleHtml().
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import type { CategoryValue } from "@/lib/constants";

export type ArticleSummary = {
  id: string;
  title: string;
  cover_image: string | null;
  category: { name: string };
};

export async function getArticleList(category?: CategoryValue): Promise<ArticleSummary[]> {
  return prisma.featuredArticle.findMany({
    where: category ? { category: { name: category } } : undefined,
    orderBy: [{ category: { name: "asc" } }, { title: "asc" }],
    select: { id: true, title: true, cover_image: true, category: { select: { name: true } } },
  });
}

export async function getArticleDetail(id: string) {
  return prisma.featuredArticle.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, cover_image: true } } },
  });
}

/** Other articles in the same fandom, for the "read next" shelf. */
export async function getSiblingArticles(articleId: string, categoryId: string, limit = 3) {
  return prisma.featuredArticle.findMany({
    where: { AND: [{ category_id: categoryId }, { id: { not: articleId } }] },
    orderBy: { title: "asc" },
    take: limit,
    select: { id: true, title: true, cover_image: true, category: { select: { name: true } } },
  });
}
