// ---------------------------------------------------------------------------
// Fan Hub Plus — content card
// Prime-style landscape unit: wide backdrop art, a hover overlay that reveals
// actions, and a slim caption row so the card also works without a pointer.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ContentMedia,
  HeatIcon,
  heatLabel,
  typeLabel,
} from "@/components/explore/content-media";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ContentCardItem } from "@/lib/queries/content";

// Sizes shared by the grid + lanes so every card keeps the same proportions.
export const CONTENT_CARD_ASPECT = "aspect-[16/9]";

export function ContentCard({
  item,
  widthClass = "w-full",
}: {
  item: ContentCardItem;
  widthClass?: string;
}) {
  return (
    <Link
      href={`/content/${item.id}`}
      className={`group relative block overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:ring-white/10 ${widthClass}`}
    >
      {/* Wide backdrop art */}
      <div className={`relative overflow-hidden ${CONTENT_CARD_ASPECT}`}>
        <ContentMedia
          src={item.backdrop_url}
          type={item.type}
          title={item.title}
        />
        {/* Soft bottom shade keeps the caption legible */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Prime-style hover reveal */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/55 to-black/10 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80">
            <Badge className="border-white/20 bg-white/10 px-1.5 py-0 text-white">
              {item.category ? CATEGORY_LABELS[item.category.name] : "Fan Hub"}
            </Badge>
            <span className="text-white/60">
              {typeLabel(item.type)}
              {item.genre ? ` · ${item.genre}` : ""}
            </span>
          </span>
          <h3 className="mt-1.5 line-clamp-2 text-lg font-heading font-semibold tracking-wide text-white">
            {item.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/70">
            {item.description}
          </p>
          <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition-colors group-hover:bg-rose-500">
            <Play className="size-4 fill-current" aria-hidden="true" />
            {item.type === "VIDEO" ? "Watch now" : "More info"}
          </span>
        </div>

        {/* Play badge visible on hover only */}
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 flex size-9 scale-50 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
        >
          <Play className="size-4 fill-current" />
        </span>
      </div>

      {/* Slim Always-visible caption strip */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <span className="truncate text-sm font-medium text-foreground">
          {item.title}
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs">
          {item.ratingCount ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Star
                className="size-3.5 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              {item.ratingAvg?.toFixed(1)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
            <HeatIcon />
            {heatLabel(item.popularity_score)}
          </span>
        </span>
      </div>
    </Link>
  );
}