// ---------------------------------------------------------------------------
// Fan Hub Plus — merchandise card (client link card)
// Shows price, availability state and a fandom chip. Pure presentational —
// the page supplies normalized data from query/merch.ts.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { Eye, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPrice, TAG_LABELS } from "@/lib/queries/merch";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";

export type MerchCardItem = {
  id: string;
  name: string;
  image_url: string | null;
  tag: keyof typeof TAG_LABELS;
  is_upcoming: boolean;
  view_count: number;
  price: string | null;
  category: { name: string };
};

export function MerchCard({ item }: { item: MerchCardItem }) {
  const tagLabel = TAG_LABELS[item.tag];

  return (
    <Link href={`/merch/${item.id}`} className="group block focus:outline-none">
      <Card className="space-y-3 transition-all group-hover:border-primary/40 group-hover:shadow-md">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {item.is_upcoming ? (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="size-3" aria-hidden="true" />
                Upcoming
              </Badge>
            ) : (
              <Badge>{tagLabel}</Badge>
            )}
          </div>
        </div>
        <div className="space-y-1 p-0">
          <h3 className="line-clamp-2 font-medium group-hover:text-primary">
            {item.name}
          </h3>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-primary">
              {formatPrice(item.price)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="size-3.5" aria-hidden="true" />
              {item.view_count.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {item.category.name in CATEGORY_LABELS
              ? CATEGORY_LABELS[item.category.name as CategoryValue]
              : item.category.name}
          </p>
        </div>
      </Card>
    </Link>
  );
}