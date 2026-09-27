import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

function baseUrl() {
  const configured = process.env.APP_URL;
  try {
    const url = new URL(configured && /^https?:\/\//i.test(configured) ? configured : "http://localhost:3000");
    return url.origin;
  } catch { return "http://localhost:3000"; }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const [articles, contents, characters, merchandise] = await Promise.all([
    prisma.featuredArticle.findMany({ select: { id: true } }),
    prisma.content.findMany({ select: { id: true } }),
    prisma.characterProfile.findMany({ select: { id: true } }),
    prisma.merchandiseItem.findMany({ select: { id: true } }),
  ]);
  const publicPaths = ["", "/explore", "/upcoming", "/characters", "/articles", "/merch", "/events", "/chatbot", "/sitemap"];
  return [
    ...publicPaths.map((path) => ({ url: `${base}${path}`, changeFrequency: path ? "weekly" as const : "daily" as const, priority: path ? 0.7 : 1 })),
    ...articles.map(({ id }) => ({ url: `${base}/articles/${encodeURIComponent(id)}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...contents.map(({ id }) => ({ url: `${base}/content/${encodeURIComponent(id)}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...characters.map(({ id }) => ({ url: `${base}/characters/${encodeURIComponent(id)}`, changeFrequency: "monthly" as const, priority: 0.4 })),
    ...merchandise.map(({ id }) => ({ url: `${base}/merch/${encodeURIComponent(id)}`, changeFrequency: "weekly" as const, priority: 0.4 })),
  ];
}
