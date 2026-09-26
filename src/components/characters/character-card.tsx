// ---------------------------------------------------------------------------
// Fan Hub Plus — character card
// Compact tiles used inside the grouped character hall-of-fame pages.
// ---------------------------------------------------------------------------

import Link from "next/link";
import Image from "next/image";
import { ContactRound } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";

export type CharacterCardItem = {
  id: string;
  name: string;
  bio: string;
  image_url: string | null;
  category: { name: CategoryValue };
};

export function CharacterCard({ character }: { character: CharacterCardItem }) {
  return (
    <Link
      href={`/characters/${character.id}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-lg">
        <CardContent className="relative aspect-square p-0">
          {character.image_url ? (
            <Image
              src={character.image_url}
              alt={character.name}
              fill
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center bg-gradient-to-br from-primary/25 via-rose-100 to-accent/25"
            >
              <ContactRound className="size-12 text-primary/70" strokeWidth={1.5} />
            </div>
          )}
        </CardContent>
        <CardHeader className="gap-1.5 pb-3">
          <Badge variant="secondary" className="w-fit text-xs">
            {CATEGORY_LABELS[character.category.name]}
          </Badge>
          <h3 className="font-heading text-base font-semibold tracking-wide">
            {character.name}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {character.bio}
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}