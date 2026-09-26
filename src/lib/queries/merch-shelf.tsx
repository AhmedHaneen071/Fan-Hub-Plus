import { prisma } from "@/lib/prisma";
import { MerchCard, type MerchCardItem } from "@/components/merch/merch-card";

type MerchSibling = {
  id: string;
  name: string;
  price: string | null;
  tag: MerchCardItem["tag"];
  image_url: string | null;
  is_upcoming: boolean;
  view_count: number;
  category_id: string;
  category: { name: string };
};

export async function getMerchSiblingShelf(
  itemId: string,
  categoryId: string,
  limit = 4,
): Promise<MerchSibling[]> {
  const rows = await prisma.merchandiseItem.findMany({
    where: { AND: [{ category_id: categoryId }, { id: { not: itemId } }] },
    orderBy: { view_count: "desc" },
    take: limit,
    include: { category: { select: { name: true } } },
  });
  return rows.map(({ price, ...row }) => ({
    ...row,
    price: price?.toString() ?? null,
  }));
}

export function MerchSiblingShelf({ items }: { items: MerchSibling[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="merch-other-heading" className="space-y-4">
      <h2
        id="merch-other-heading"
        className="text-2xl font-heading font-semibold tracking-wide"
      >
        More from this shelf
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <MerchCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}