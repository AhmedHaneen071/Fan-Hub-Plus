// ---------------------------------------------------------------------------
// Fan Hub Plus — merchandise detail  (/merch/[id])
// Full item presentation: image, price, availability state and a community
// bookmark. A "more from this shelf" row points back to the showroom.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Eye, Package } from "lucide-react";
import { auth } from "@/auth";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { BookmarkButton } from "@/components/engagement/bookmark-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMerchDetail, formatPrice, TAG_LABELS } from "@/lib/queries/merch";
import { getMerchSiblingShelf, MerchSiblingShelf } from "@/lib/queries/merch-shelf";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type MerchDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: MerchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getMerchDetail(id);
  return {
    title: item ? `${item.name} · Fan Hub Plus` : "Merchandise · Fan Hub Plus",
    description: item ? `${TAG_LABELS[item.tag]} from Fan Hub Plus.` : undefined,
  };
}

export default async function MerchDetailPage({ params }: MerchDetailPageProps) {
  const { id } = await params;
  const item = await getMerchDetail(id);
  if (!item) notFound();

  const session = await auth();
  const [bookmark] = session?.user?.id
    ? await prisma.bookmark.findMany({
        where: { user_id: session.user.id, merchandise_id: item.id },
        select: { id: true, note: true },
        take: 1,
      })
    : [null];

  const shelf = await getMerchSiblingShelf(item.id, item.category_id);

  const categoryLabel = CATEGORY_LABELS[item.category.name as CategoryValue] ?? item.category.name;

  return (
    <div className="space-y-10">
      <Breadcrumbs
        crumbs={[
          { label: "Merchandise", href: "/merch" },
          { label: item.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="relative aspect-square p-0">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <Package className="size-12" aria-hidden="true" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TAG_LABELS[item.tag]}</Badge>
            <Badge variant="outline">{categoryLabel}</Badge>
            {item.is_upcoming ? (
              <Badge variant="outline" className="gap-1 text-violet-600">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                Upcoming release
              </Badge>
            ) : null}
          </div>

          <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
            {item.name}
          </h1>

          <p className="text-3xl font-semibold text-primary">
            {formatPrice(item.price)}
          </p>

          <p className="max-w-prose leading-relaxed text-foreground/90">
            {item.is_upcoming
              ? "On the way to the showroom. Bookmark it so you don't miss the drop, and keep an eye on the community spotlight for the launch date."
              : "Ready to admire in the showroom. Display pricing only — this student project doesn't process real payments."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {session?.user?.id ? (
              <BookmarkButton
                targetType="merchandise"
                targetId={item.id}
                bookmarkId={bookmark?.id ?? null}
                initialBookmarked={Boolean(bookmark)}
                note={bookmark?.note ?? null}
                signedIn
              />
            ) : (
              <Button asChild>
                <Link href="/login">Sign in to bookmark</Link>
              </Button>
            )}
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="size-4" aria-hidden="true" />
              {item.view_count.toLocaleString()} views
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href={`/merch?category=${item.category.name}`}>
              Back to the {categoryLabel} shelf
            </Link>
          </Button>
        </div>
      </div>

      <MerchSiblingShelf items={shelf} />
    </div>
  );
}