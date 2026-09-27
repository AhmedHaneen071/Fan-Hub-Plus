import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";

export const metadata: Metadata = { title: "Sitemap", description: "Find your way around Fan Hub Plus." };

export default async function SitemapPage() {
  const [categories, articles, characters, content, merchandise] = await Promise.all([
    prisma.category.findMany({ select: { name: true } , orderBy: { name: "asc" } }),
    prisma.featuredArticle.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.characterProfile.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.content.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.merchandiseItem.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const sections: { title: string; rows: { label: string; href: string }[] }[] = [
    { title: "Explore", rows: [{ label: "Home", href: "/" }, { label: "Content explorer", href: "/explore" }, { label: "Upcoming releases", href: "/upcoming" }, { label: "Events", href: "/events" }, { label: "Chatbot", href: "/chatbot" }, { label: "Dashboard", href: "/dashboard" }] },
    { title: "Fandoms", rows: categories.map(({ name }) => ({ label: CATEGORY_LABELS[name as CategoryValue] ?? name, href: `/explore?category=${encodeURIComponent(name)}` })) },
    { title: "Articles", rows: [{ label: "All articles", href: "/articles" }, ...articles.map(({ id, title }) => ({ label: title, href: `/articles/${encodeURIComponent(id)}` }))] },
    { title: "Characters", rows: [{ label: "All characters", href: "/characters" }, ...characters.map(({ id, name }) => ({ label: name, href: `/characters/${encodeURIComponent(id)}` }))] },
    { title: "Catalogue", rows: [...content.map(({ id, title }) => ({ label: title, href: `/content/${encodeURIComponent(id)}` })), ...merchandise.map(({ id, name }) => ({ label: name, href: `/merch/${encodeURIComponent(id)}` }))] },
  ];
  return <div className="space-y-8"><Breadcrumbs crumbs={[{ label: "Sitemap" }]} /><header><h1 className="text-3xl font-heading font-bold">Sitemap</h1><p className="mt-2 text-muted-foreground">Browse public sections and published fandom content.</p></header><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{sections.map((section) => <section key={section.title} className="rounded-xl border bg-card p-5"><h2 className="font-heading text-xl">{section.title}</h2><ul className="mt-3 space-y-2 text-sm">{section.rows.map((row) => <li key={row.href}><Link className="text-primary hover:underline" href={row.href}>{row.label}</Link></li>)}</ul></section>)}</div></div>;
}
