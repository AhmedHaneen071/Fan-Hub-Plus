import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { ContentCard } from "@/components/explore/content-card";
import { MerchCard } from "@/components/merch/merch-card";
import { prisma } from "@/lib/prisma";
import { getUpcomingContent } from "@/lib/queries/content";

export const metadata: Metadata = { title: "Upcoming releases", description: "Fandom content and merchandise releases coming soon." };

export default async function UpcomingPage() {
  const [content, merchandise] = await Promise.all([
    getUpcomingContent(),
    prisma.merchandiseItem.findMany({ where: { is_upcoming: true }, orderBy: [{ created_at: "desc" }], include: { category: { select: { name: true } } } }),
  ]);
  return <div className="space-y-8"><Breadcrumbs crumbs={[{ label: "Upcoming releases" }]} /><header><h1 className="text-3xl font-heading font-bold">Coming soon</h1><p className="mt-2 text-muted-foreground">Upcoming content and display-only merchandise from across the fandoms.</p></header>
    <section aria-labelledby="upcoming-content"><h2 id="upcoming-content" className="mb-4 text-2xl font-heading">Content releases</h2>{content.length ? <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{content.map((item) => <li key={item.id}><ContentCard item={item} /></li>)}</ul> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No content releases have been announced yet.</p>}</section>
    <section aria-labelledby="upcoming-merch"><h2 id="upcoming-merch" className="mb-4 text-2xl font-heading">Merchandise showcase</h2>{merchandise.length ? <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{merchandise.map((item) => <li key={item.id}><MerchCard item={{ id: item.id, name: item.name, image_url: item.image_url, tag: item.tag, is_upcoming: item.is_upcoming, view_count: item.view_count, price: item.price?.toString() ?? null, category: item.category }} /></li>)}</ul> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No merchandise drops have been announced yet.</p>}</section>
  </div>;
}
