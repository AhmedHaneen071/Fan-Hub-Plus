// ---------------------------------------------------------------------------
// Fan Hub Plus — rating widget (client)
// Lets a signed-in user rate content with either a 5-star scale or a thumbs
// up/down. Shows the live community rating alongside their own selection.
// Raters can change the scale at any time — the last interaction wins.
// ---------------------------------------------------------------------------

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { upsertRating, removeRating } from "@/lib/engagement-actions";

export type RatingWidgetProps = {
  contentId: string;
  signedIn: boolean;
  initial: { value: number; ratingType: "STARS" | "THUMBS" } | null;
  community: {
    starsAvg: number | null;
    starsCount: number;
    thumbsUp: number;
    thumbsDown: number;
  };
};

export function RatingWidget({
  contentId,
  signedIn,
  initial,
  community,
}: RatingWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<Awaited<ReturnType<typeof upsertRating>>>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? "Rating saved.");
        router.refresh();
      } else {
        toast.error(result.error);
        if (result.redirectTo) router.push(result.redirectTo);
      }
    });
  }

  function onStar(star: number) {
    if (initial?.ratingType === "STARS" && initial.value === star) {
      run(() => removeRating(contentId));
    } else {
      run(() => upsertRating(contentId, "STARS", star));
    }
  }

  function onThumb(direction: 1 | -1) {
    if (initial?.ratingType === "THUMBS" && initial.value === direction) {
      run(() => removeRating(contentId));
    } else {
      run(() => upsertRating(contentId, "THUMBS", direction));
    }
  }

  const communityStars =
    community.starsCount > 0 && community.starsAvg !== null
      ? community.starsAvg.toFixed(1)
      : "—";

  return (
    <div className="space-y-3">
      {/* Community rating summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1 font-medium">
          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span>{communityStars}</span>
          <span className="text-muted-foreground">
            ({community.starsCount} star rating{community.starsCount === 1 ? "" : "s"})
          </span>
        </span>
        {community.thumbsUp + community.thumbsDown > 0 ? (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="size-3.5" aria-hidden="true" />
              {community.thumbsUp}
            </span>
            <span className="inline-flex items-center gap-1">
              <ThumbsDown className="size-3.5" aria-hidden="true" />
              {community.thumbsDown}
            </span>
          </span>
        ) : null}
      </div>

      {signedIn ? (
        // Present to signed-in users; disabled while a previous action runs.
        <div className="flex flex-wrap items-center gap-3" aria-label="Rate this content">
          <div
            role="radiogroup"
            aria-label="Star rating"
            className="inline-flex items-center gap-0.5"
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const active =
                initial?.ratingType === "STARS" && star <= initial.value;
              return (
                <Button
                  key={star}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={isPending}
                  onClick={() => onStar(star)}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  aria-pressed={active}
                >
                  <Star
                    className={active ? "size-4 fill-amber-400 text-amber-400" : "size-4 text-muted-foreground"}
                    aria-hidden="true"
                  />
                </Button>
              );
            })}
          </div>

          <span className="text-xs text-muted-foreground" aria-hidden="true">
            or
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onThumb(1)}
            className={initial?.ratingType === "THUMBS" && initial.value === 1 ? "border-primary text-primary" : ""}
            aria-pressed={initial?.ratingType === "THUMBS" && initial.value === 1}
          >
            <ThumbsUp aria-hidden="true" />
            Like
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onThumb(-1)}
            className={initial?.ratingType === "THUMBS" && initial.value === -1 ? "border-primary text-primary" : ""}
            aria-pressed={initial?.ratingType === "THUMBS" && initial.value === -1}
          >
            <ThumbsDown aria-hidden="true" />
            Dislike
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to rate this content and shape its community ranking.
        </p>
      )}
    </div>
  );
}