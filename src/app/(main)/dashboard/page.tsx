// ---------------------------------------------------------------------------
// Fan Hub Plus — member dashboard  (/dashboard)
// The signed-in hub: personal stats, favourite fandoms, bookmarks and the
// ratings you have given. Tab is a URL parameter (?tab=…) so views stay
// shareable and the back button behaves.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookmarkCheck, Heart, MessagesSquare, Star } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SUSPENDED_PATH, isSuspended } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { FavoritesEditor } from "@/components/dashboard/favorites-editor";
import {
  BookmarksTab,
  type BookmarkRow,
} from "@/components/dashboard/bookmarks-tab";
import { RatingsTab, type RatingRow } from "@/components/dashboard/ratings-tab";
import { FeedbackTab, type FeedbackRow } from "@/components/dashboard/feedback-tab";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import { FEEDBACK_STATUSES } from "@/lib/validations/admin";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Fan Hub Plus activity at a glance.",
};

const TABS = ["overview", "bookmarks", "ratings", "feedback"] as const;
type Tab = (typeof TABS)[number];

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (isSuspended(session)) redirect(SUSPENDED_PATH);


  const raw = await searchParams;
  const requested = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? "") ? (requested as Tab) : "overview";

  const userId = session.user.id;

  // All the data the tabs need, fetched in parallel.
  const [user, categories, bookmarkRows, ratingRows, feedbackRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        favoriteCategories: { select: { name: true } },
        _count: { select: { bookmarks: true, ratings: true } },
        submissions: {
          select: { status: true, title: true, created_at: true },
          orderBy: { created_at: "desc" },
          take: 3,
        },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.bookmark.findMany({
      where: { user_id: userId },
      include: {
        content: { select: { id: true, title: true } },
        character: { select: { id: true, name: true } },
        merchandise: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.rating.findMany({
      where: { user_id: userId },
      include: { content: { select: { id: true, title: true } } },
      orderBy: { created_at: "desc" },
    }),
    prisma.feedback.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
  ]);

  if (!user) redirect("/login");

  const bookmarks: BookmarkRow[] = bookmarkRows
    .map((bookmark) => {
      let target: BookmarkRow["target"] | null = null;
      if (bookmark.content) {
        target = {
          kind: "content",
          href: `/content/${bookmark.content.id}`,
          title: bookmark.content.title,
        };
      } else if (bookmark.character) {
        target = {
          kind: "character",
          href: `/characters/${bookmark.character.id}`,
          title: bookmark.character.name,
        };
      } else if (bookmark.merchandise) {
        target = {
          kind: "merchandise",
          href: `/merch/${bookmark.merchandise.id}`,
          title: bookmark.merchandise.name,
        };
      }
      return target ? {
        id: bookmark.id,
        note: bookmark.note,
        createdAt: bookmark.created_at.toISOString(),
        target,
      } : null;
    })
    .filter((row): row is BookmarkRow => row !== null);

  const ratings: RatingRow[] = ratingRows.map((rating) => ({
    id: rating.id,
    value: rating.value,
    ratingType: rating.ratingType,
    createdAt: rating.created_at.toISOString(),
    content: rating.content,
  }));

  // Feedback.status is a plain String column, so it is narrowed here rather
  // than cast at the render site: a value the UI does not know about falls back
  // to OPEN instead of silently disappearing from the member's history.
  const feedback: FeedbackRow[] = feedbackRows.map((row) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    status: FEEDBACK_STATUSES.includes(row.status as never)
      ? (row.status as FeedbackRow["status"])
      : "OPEN",
    createdAt: row.created_at.toISOString(),
  }));

  const favorites = new Set(
    user.favoriteCategories.map((favorite) => favorite.name),
  );
  const favoriteEditorData = categories.map((category) => ({
    name: category.name as CategoryValue,
    favorited: favorites.has(category.name as CategoryValue),
  }));

  const latestSubmission = user.submissions[0];
  const activity = [
    ...bookmarkRows.map((row) => ({ label: `Bookmarked ${row.content?.title ?? row.character?.name ?? row.merchandise?.name ?? "an item"}`, at: row.created_at })),
    ...ratingRows.map((row) => ({ label: `Rated ${row.content.title}`, at: row.created_at })),
    ...user.submissions.map((row) => ({ label: `Submitted “${row.title}” (${row.status.toLowerCase()})`, at: row.created_at })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8);

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Dashboard" }]} />

      <header className="space-y-1">
        <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
          Welcome, {user.name}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your Fan Hub Plus.
        </p>
      </header>

      {/* Tab switcher */}
      <nav aria-label="Dashboard sections" className="flex flex-wrap gap-1 border-b border-rose-100 pb-px dark:border-rose-500/20">
        {TABS.map((item) => (
          <Button
            key={item}
            asChild
            variant={tab === item ? "secondary" : "ghost"}
            className={tab === item ? "rounded-b-none border-x border-t border-rose-100 dark:border-rose-500/20" : "rounded-b-none text-muted-foreground"}
            aria-current={tab === item ? "page" : undefined}
          >
            <Link href={`/dashboard?tab=${item}`} className="capitalize">
              {item}
            </Link>
          </Button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-5 md:grid-cols-2">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <Stat icon={BookmarkCheck} label="Bookmarks" value={user._count.bookmarks} />
              <Stat icon={Star} label="Ratings" value={user._count.ratings} />
              <Stat icon={MessagesSquare} label="Submissions" value={user.submissions.length} />
            </CardContent>
            {latestSubmission ? (
              <CardContent className="pt-2 text-sm text-muted-foreground">
                Latest fan submission:{" "}
                <span className="font-medium text-foreground">
                  {latestSubmission.title}
                </span>{" "}
                ·{" "}
                <Badge variant="outline" className="text-xs">
                  {latestSubmission.status.toLowerCase()}
                </Badge>
              </CardContent>
            ) : null}
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
            <CardContent>{activity.length ? <ol className="space-y-3">{activity.map((item, index) => <li key={`${item.at.toISOString()}-${index}`} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm last:border-0"><span>{item.label}</span><time dateTime={item.at.toISOString()} className="text-muted-foreground">{item.at.toLocaleDateString()}</time></li>)}</ol> : <p className="text-sm text-muted-foreground">Your bookmarks, ratings, and submissions will show here.</p>}</CardContent>
          </Card>

          {/* Favourite fandoms */}
          <Card>
            <CardHeader>
              <CardTitle>Your fandoms</CardTitle>
            </CardHeader>
            <CardContent>
              <FavoritesEditor categories={favoriteEditorData} />
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Jump back in</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/explore">Browse content</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/characters">Meet characters</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/merch">Shop the showroom</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/events">Find events</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/submit">Share fan content</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/chatbot">Ask the hub</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "bookmarks" ? <BookmarksTab rows={bookmarks} /> : null}
      {tab === "ratings" ? <RatingsTab rows={ratings} /> : null}
      {tab === "feedback" ? <FeedbackTab rows={feedback} /> : null}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Heart className="size-3.5 text-primary" aria-hidden="true" />
        Picked fandom labels match the homepage browse strip — see{" "}
        {favoriteEditorData
          .filter((favorite) => favorite.favorited)
          .map((favorite) => CATEGORY_LABELS[favorite.name])
          .join(", ") || "none yet"}
        .
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookmarkCheck;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-4 text-center">
      <Icon className="mx-auto size-5 text-primary" aria-hidden="true" />
      <p className="mt-2 font-heading text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
