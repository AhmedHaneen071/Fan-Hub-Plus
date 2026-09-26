// ---------------------------------------------------------------------------
// Fan Hub Plus — Character hall of fame  (/characters)
// Lists every character profile, grouped by fandom. An optional ?category=
// query narrows the page to one fandom (mirrors the explorer's URL pattern).
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { CharacterCard } from "@/components/characters/character-card";
import { Button } from "@/components/ui/button";
import { getCharacterGroups } from "@/lib/queries/characters";
import {
  CATEGORY_LABELS,
  CATEGORY_NAMES,
  type CategoryValue,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Characters",
  description: "Meet the characters every fandom talks about.",
};

type CharactersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CharactersPage({ searchParams }: CharactersPageProps) {
  const raw = await searchParams;
  const requested = Array.isArray(raw.category) ? raw.category[0] : raw.category;
  const category = CATEGORY_NAMES.includes(requested as CategoryValue)
    ? (requested as CategoryValue)
    : undefined;

  const groups = await getCharacterGroups(category);

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Characters" }]} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
            {category ? CATEGORY_LABELS[category] : "Character hall of fame"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {category
              ? "The fan favourites inside this fandom."
              : "The profiles the community cares about, grouped by fandom."}
          </p>
        </div>
        {category ? (
          <Button asChild variant="outline">
            <Link href="/characters">All fandoms</Link>
          </Button>
        ) : null}
      </header>

      {category ? (
        // Category pills: jump straight to a fandom's roster.
        <ul className="flex flex-wrap gap-2" aria-label="Filter by fandom">
          <li>
            <Button variant="secondary" size="sm">
              {CATEGORY_LABELS[category]}
            </Button>
          </li>
          {CATEGORY_NAMES.filter((name) => name !== category).map((name) => (
            <li key={name}>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/characters?category=${name}`}>
                  {CATEGORY_LABELS[name]}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-muted-foreground">No characters here yet.</p>
      ) : (
        groups.map(([name, characters]) => (
          <section key={name} aria-labelledby={`${name}-heading`} className="space-y-4">
            <h2
              id={`${name}-heading`}
              className="flex items-center gap-3 text-2xl font-heading font-semibold tracking-wide"
            >
              {CATEGORY_LABELS[name as CategoryValue]}
              <span className="text-sm font-normal text-muted-foreground">
                {characters.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {characters.map((character) => (
                <CharacterCard key={character.id} character={character} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}