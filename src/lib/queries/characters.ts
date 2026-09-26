// ---------------------------------------------------------------------------
// Fan Hub Plus — character queries (Phase 6: character profiles)
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import type { CategoryValue } from "@/lib/constants";

export async function getCharacterGroups(category?: CategoryValue) {
  const characters = await prisma.characterProfile.findMany({
    where: category ? { category: { name: category } } : undefined,
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    include: { category: { select: { name: true } } },
  });

  // Group characters by fandom so the page reads like a hall of fame.
  const groups = new Map<string, typeof characters>();
  for (const character of characters) {
    const key = character.category.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(character);
  }
  return [...groups.entries()];
}

export async function getCharacterDetail(id: string) {
  const character = await prisma.characterProfile.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, cover_image: true } },
    },
  });

  return character;
}

/** Same-fandom characters, newest additions first, for the "others" shelf. */
export async function getSiblingCharacters(
  characterId: string,
  categoryId: string,
  limit = 4,
) {
  return prisma.characterProfile.findMany({
    where: { AND: [{ category_id: categoryId }, { id: { not: characterId } }] },
    orderBy: { name: "asc" },
    take: limit,
    include: { category: { select: { name: true } } },
  });
}