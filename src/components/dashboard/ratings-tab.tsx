// ---------------------------------------------------------------------------
// Fan Hub Plus — ratings tab (client)
// Lists the ratings a user has given, each removable in one click.
// ---------------------------------------------------------------------------

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { removeRating } from "@/lib/engagement-actions";

export type RatingRow = {
  id: string;
  value: number;
  ratingType: "STARS" | "THUMBS";
  createdAt: string;
  content: { id: string; title: string };
};

export function RatingsTab({ rows }: { rows: RatingRow[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onRemove(contentId: string) {
    setRemoving(contentId);
    startTransition(async () => {
      const result = await removeRating(contentId);
      setRemoving(null);
      if (result.ok) {
        toast.success("Rating removed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven&apos;t rated anything yet. Open any content page and tap a
        star or a thumb to shape its ranking.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const isStar = row.ratingType === "STARS";
        return (
          <article
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
          >
            <div className="min-w-0">
              <Link
                href={`/content/${row.content.id}`}
                className="block truncate font-medium hover:text-primary hover:underline"
              >
                {row.content.title}
              </Link>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                {isStar ? (
                  <>
                    <Badge variant="outline" className="gap-1 text-amber-500">
                      <Star className="size-3.5 fill-current" aria-hidden="true" />
                      {row.value}/5
                    </Badge>
                    <span className="inline-flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          aria-hidden="true"
                          className={
                            index < row.value
                              ? "size-3 fill-amber-400 text-amber-400"
                              : "size-3 text-muted-foreground/40"
                          }
                        />
                      ))}
                    </span>
                  </>
                ) : (
                  <Badge
                    variant="outline"
                    className={
                      row.value === 1
                        ? "gap-1 text-emerald-600"
                        : "gap-1 text-destructive"
                    }
                  >
                    {row.value === 1 ? (
                      <ThumbsUp className="size-3.5" aria-hidden="true" />
                    ) : (
                      <ThumbsDown className="size-3.5" aria-hidden="true" />
                    )}
                    {row.value === 1 ? "Liked" : "Disliked"}
                  </Badge>
                )}
                <span>{new Date(row.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(row.content.id)}
              disabled={isPending && removing === row.content.id}
            >
              <X aria-hidden="true" />
              Remove
            </Button>
          </article>
        );
      })}
    </div>
  );
}