// ---------------------------------------------------------------------------
// Fan Hub Plus — merchandise queries (. /merch)
// Shop listings (filterable by fandom + availability) and a single item for
// the detail page. Prices are display-only — this project has no checkout.
// ---------------------------------------------------------------------------

import type { MerchTag } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MerchFilters = {
  category?: string;
  tag?: MerchTag | "";
};

const TAG_LABELS: Record<MerchTag, string> = {
  LIMITED_EDITION: "Limited edition",
  PRE_ORDER: "Pre-order",
  COLLECTIBLE: "Collectible",
};

export { TAG_LABELS };

// trim Decimal so "129.99" renders cleanly
export function formatPrice(price: number | string | null): string {
  if (price === null || price === undefined) return "Price on request";
  const numeric =
    typeof price === "number"
      ? price
      : Number.parseFloat(String(price)) || 0;
  return numeric === 0
    ? "Price on request"
    : numeric.toLocaleString("en", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export async function getMerchListings(filters: MerchFilters = {}) {
  const { category, tag } = filters;
  const items = await prisma.merchandiseItem.findMany({
    where: {
      AND: [
        category ? { category: { name: category as never } } : {},
        tag ? { tag } : {},
      ],
    },
    orderBy: [{ is_upcoming: "asc" }, { view_count: "desc" }],
    include: { category: { select: { name: true } } },
  });
  return items.map(({ price, ...item }) => ({
    ...item,
    price: price?.toString() ?? null,
    category: item.category,
  }));
}

export async function getMerchDetail(id: string) {
  const item = await prisma.merchandiseItem.findUnique({
    where: { id },
    include: { category: { select: { name: true } } },
  });
  if (!item) return null;
  const { price, ...rest } = item;
  return { ...rest, price: price?.toString() ?? null };
}