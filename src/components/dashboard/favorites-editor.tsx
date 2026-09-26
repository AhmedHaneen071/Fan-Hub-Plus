// ---------------------------------------------------------------------------
// Fan Hub Plus — favorite fandoms editor (client)
// Chips that toggle a fandom on/off the user's favourites list. The toggle is
// a server action; the chip list re-renders from the server after each tap.
// ---------------------------------------------------------------------------

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFavoriteCategory } from "@/lib/profile-actions";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";

type FavoritesEditorProps = {
  categories: { name: CategoryValue; favorited: boolean }[];
};

export function FavoritesEditor({ categories }: FavoritesEditorProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onToggle(name: CategoryValue) {
    setPending(name);
    startTransition(async () => {
      const result = await toggleFavoriteCategory(name);
      setPending(null);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const favorites = categories.filter((category) => category.favorited);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map(({ name, favorited }) => (
          <Button
            key={name}
            type="button"
            variant={favorited ? "secondary" : "outline"}
            size="sm"
            disabled={isPending && pending !== name}
            onClick={() => onToggle(name)}
            aria-pressed={favorited}
            className="rounded-full"
          >
            {favorited ? (
              <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
            ) : (
              <Check className="size-3.5 opacity-0" aria-hidden="true" />
            )}
            {CATEGORY_LABELS[name]}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {favorites.length === 0
          ? "Nothing picked yet — tap a fandom to add it to your list."
          : `${favorites.length} favourite${favorites.length === 1 ? "" : "s"}: ${favorites
              .map((favorite) => CATEGORY_LABELS[favorite.name])
              .join(", ")}.`}
      </p>
    </div>
  );
}