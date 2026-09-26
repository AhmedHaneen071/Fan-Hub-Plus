// ---------------------------------------------------------------------------
// Fan Hub Plus — merchandise showroom  (/merch)
// Grid of items across every fandom, with category + availability filters
// kept in the URL (?category=…&tag=…) so views stay shareable.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { MerchCard } from "@/components/merch/merch-card";
import { Button } from "@/components/ui/button";
import { getMerchListings } from "@/lib/queries/merch";
import {
  CATEGORY_LABELS,
  CATEGORY_NAMES,
  type CategoryValue,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Merchandise",
  description: "The Fan Hub Plus bootleg-free shop for every fandom.",
};

const TAG_OPTIONS = [
  { value: "", label: "All items" },
  { value: "COLLECTIBLE", label: "Collectibles" },
  { value: "LIMITED_EDITION", label: "Limited editions" },
  { value: "PRE_ORDER", label: "Pre-orders" },
] as const;

type MerchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MerchPage({ searchParams }: MerchPageProps) {
  const raw = await searchParams;
  const category =
    typeof raw.category === "string" && (CATEGORY_NAMES as readonly string[]).includes(raw.category)
      ? raw.category
      : "";
  const tag =
    typeof raw.tag === "string" &&
    (["COLLECTIBLE", "LIMITED_EDITION", "PRE_ORDER"] as const).includes(raw.tag as never)
      ? (raw.tag as "COLLECTIBLE" | "LIMITED_EDITION" | "PRE_ORDER")
      : "";

  const items = await getMerchListings({ category: category || undefined, tag: tag || undefined });

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Merchandise" }]} />

      <header className="space-y-1">
        <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
          The showroom
        </h1>
        <p className="text-muted-foreground">
          Official-style gear and collectibles picked by the community — display
          prices only.
        </p>
      </header>

      {/* Fandom pills */}
      <div className="flex flex-wrap gap-1.5" aria-label="Filter by fandom">
        <Button asChild variant={category ? "ghost" : "secondary"} size="sm">
          <Link
            href={{
              pathname: "/merch",
              query: { ...(tag ? { tag } : {}) },
            }}
          >
            All fandoms
          </Link>
        </Button>
        {CATEGORY_NAMES.map((name) => (
          <Button
            key={name}
            asChild
            variant={category === name ? "secondary" : "ghost"}
            size="sm"
          >
            <Link
              href={{
                pathname: "/merch",
                query: {
                  ...(name === category ? {} : { category: name }),
                  ...(tag ? { tag } : {}),
                },
              }}
            >
              {CATEGORY_LABELS[name as CategoryValue]}
            </Link>
          </Button>
        ))}
      </div>

      {/* Availability pills */}
      <div className="flex flex-wrap gap-1.5" aria-label="Filter by availability">
        {TAG_OPTIONS.map((option) => (
          <Button
            key={option.value}
            asChild
            variant={tag === option.value ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full"
          >
            <Link
              href={{
                pathname: "/merch",
                query: {
                  ...(category ? { category } : {}),
                  ...(option.value ? { tag: option.value } : {}),
                },
              }}
            >
              {option.label}
            </Link>
          </Button>
        ))}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <MerchCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <ShoppingBag className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            No items match those filters — try clearing a pill above.
          </p>
        </div>
      )}
    </div>
  );
}