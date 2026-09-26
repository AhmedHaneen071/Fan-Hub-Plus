// ---------------------------------------------------------------------------
// Fan Hub Plus — character profile detail  (/characters/[id])
// Bio + bookmark for a single fandom character, with a shelf of their
// same-fandom peers. Bookmarking a character is the Phase 3 polymorphic
// bookmark table in action (character_id column).
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ContactRound } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { CharacterCard } from "@/components/characters/character-card";
import { BookmarkButton } from "@/components/engagement/bookmark-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCharacterDetail,
  getSiblingCharacters,
} from "@/lib/queries/characters";
import {
  CATEGORY_LABELS,
  type CategoryValue,
} from "@/lib/constants";

type CharacterDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CharacterDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const character = await getCharacterDetail(id);
  return {
    title: character ? `${character.name} · Fan Hub Plus` : "Character · Fan Hub Plus",
    description: character?.bio,
  };
}

export default async function CharacterDetailPage({
  params,
}: CharacterDetailPageProps) {
  const { id } = await params;
  const character = await getCharacterDetail(id);
  if (!character) notFound();

  const [siblings, session] = await Promise.all([
    getSiblingCharacters(id, character.category_id),
    auth(),
  ]);

  const signedIn = Boolean(session?.user?.id);
  const myBookmark = signedIn
    ? await prisma.bookmark.findFirst({
        where: { user_id: session!.user!.id!, character_id: id },
        select: { id: true, note: true },
      })
    : null;

  const crumbs = [
    { label: "Characters", href: "/characters" },
    { label: character.name },
  ];

  return (
    <div className="space-y-10">
      <Breadcrumbs crumbs={crumbs} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-2">
          <CardContent className="relative aspect-square p-0">
            {character.image_url ? (
              <Image
                src={character.image_url}
                alt={character.name}
                fill
                sizes="(min-width:1024px) 40vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex size-full items-center justify-center bg-gradient-to-br from-primary/25 via-rose-100 to-accent/25"
              >
                <ContactRound className="size-16 text-primary/70" strokeWidth={1.5} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {CATEGORY_LABELS[character.category.name as CategoryValue]}
            </Badge>
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
            {character.name}
          </h1>
          <p className="max-w-prose leading-relaxed text-foreground/90">
            {character.bio}
          </p>
          <BookmarkButton
            targetType="character"
            targetId={character.id}
            bookmarkId={myBookmark?.id ?? null}
            initialBookmarked={Boolean(myBookmark)}
            note={myBookmark?.note ?? null}
            signedIn={signedIn}
          />
        </div>
      </div>

      {siblings.length > 0 ? (
        <section aria-labelledby="siblings-heading" className="space-y-4">
          <h2
            id="siblings-heading"
            className="text-2xl font-heading font-semibold tracking-wide"
          >
            More characters from{" "}
            {CATEGORY_LABELS[character.category.name as CategoryValue]}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {siblings.map((sibling) => (
              <CharacterCard key={sibling.id} character={sibling} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}