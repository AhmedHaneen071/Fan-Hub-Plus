// ---------------------------------------------------------------------------
// Fan Hub Plus — Content detail  (/content/[id])
//
// Full item view: media, metadata, description and a "more like this" shelf.
// Ratings and bookmarking arrive in Phase 3 (user engagement) — this page is
// the read-only deep-link target the explorer cards point at.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Flame } from "lucide-react";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { ContentMedia, heatLabel } from "@/components/explore/content-media";
import { ContentLane } from "@/components/content/content-lane";
import { ContentEngagement } from "@/components/engagement/content-engagement";
import { MediaPlayer } from "@/components/content/media-player";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getContentDetail, getRelatedContent } from "@/lib/queries/content";
import {
  CATEGORY_LABELS,
  CONTENT_TYPE_LABELS,
  type CategoryValue,
} from "@/lib/constants";

type ContentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ContentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getContentDetail(id);
  return {
    title: item ? `${item.title} · Fan Hub Plus` : "Content · Fan Hub Plus",
    description: item?.description,
  };
}

function formatDate(date: Date | null): string {
  if (!date) return "Unknown release date";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function ContentDetailPage({
  params,
}: ContentDetailPageProps) {
  const { id } = await params;
  const item = await getContentDetail(id);
  if (!item) notFound();

  const related = await getRelatedContent(item.id, item.category_id, 10);
  const backdrop = item.media_url ?? item.category.cover_image;

  const crumbs = [
    { label: "Explore", href: "/explore" },
    { label: CATEGORY_LABELS[item.category.name as CategoryValue], href: `/explore?category=${item.category.name}` },
    { label: item.title },
  ];

  return (
    <div className="space-y-12">
      <Breadcrumbs crumbs={crumbs} />

      {/* Prime-style cinematic hero: wide backdrop art with a gradient fade
          into the stage + the featured player and detail column on top. */}
      <section className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-rose-100 to-accent/15" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-card/40" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-card to-transparent" />

        <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-5 lg:items-center">
          {/* Featured player / poster */}
          <div className="self-start lg:col-span-2">
            {item.trailer_url ? (
              <MediaPlayer
                trailerUrl={item.trailer_url}
                title={item.title}
                poster={item.media_url}
              />
            ) : (
              <Card className="overflow-hidden shadow-2xl ring-1 ring-black/10">
                <CardContent className="relative aspect-video p-0">
                  <ContentMedia
                    src={item.media_url}
                    type={item.type}
                    title={item.title}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Detail column */}
          <div className="space-y-5 lg:col-span-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  <Link
                    href={`/explore?category=${item.category.name}`}
                    className="hover:underline"
                  >
                    {CATEGORY_LABELS[item.category.name as CategoryValue]}
                  </Link>
                </Badge>
                <Badge variant="outline">{CONTENT_TYPE_LABELS[item.type]}</Badge>
                {item.genre ? <Badge variant="outline">{item.genre}</Badge> : null}
                <Badge variant="outline" className="gap-1 text-orange-500">
                  <Flame className="size-3.5" aria-hidden="true" />
                  {item.popularity_score} · {heatLabel(item.popularity_score)}
                </Badge>
              </div>
              <h1 className="mt-3 text-4xl font-heading font-bold tracking-wide sm:text-5xl">
                {item.title}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatDate(item.release_date)}
              </p>
            </div>

            <p className="max-w-prose leading-relaxed text-foreground/90">
              {item.description}
            </p>

            <ContentEngagement contentId={item.id} />
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <ContentLane
          title={`More from ${CATEGORY_LABELS[item.category.name as CategoryValue]}`}
          href={`/explore?category=${item.category.name}`}
          items={related}
        />
      ) : null}
    </div>
  );
}