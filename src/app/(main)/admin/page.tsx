// ---------------------------------------------------------------------------
// Fan Hub Plus — admin area  (/admin)   (Phase 11)
// Role-gated management console: overview stats, the fan-submission
// moderation queue, the chatbot knowledge base and usage numbers. Only an
// ADMIN session may proceed; the guard repeats on every server action.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, MessageSquare, Package, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import {
  SubmissionsManager,
  type SubmissionRow,
} from "@/components/admin/submissions-manager";
import { FaqManager, type FaqRow } from "@/components/admin/faq-manager";

export const metadata: Metadata = {
  title: "Admin",
  description: "Fan Hub Plus administration.",
};

const TABS = ["overview", "submissions", "faqs", "usage"] as const;
type Tab = (typeof TABS)[number];

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const raw = await searchParams;
  const requested = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? "")
    ? (requested as Tab)
    : "overview";

  const [
    stats,
    submissions,
    faqs,
    topBookmarked,
    topRated,
    feedback,
    recentQueries,
  ] = await Promise.all([
    prisma.$transaction([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.content.count(),
      prisma.merchandiseItem.count(),
      prisma.event.count(),
      prisma.fanSubmission.count({ where: { status: "PENDING" } }),
      prisma.chatbotFAQ.count(),
      prisma.bookmark.count(),
      prisma.rating.count(),
    ]),
    prisma.fanSubmission.findMany({
      orderBy: { created_at: "desc" },
      take: 30,
      include: { user: { select: { name: true, email: true } }, category: { select: { name: true } } },
    }),
    prisma.chatbotFAQ.findMany({ orderBy: { created_at: "asc" } }),
    prisma.bookmark.groupBy({
      by: ["content_id"],
      _count: { _all: true },
      orderBy: { _count: { content_id: "desc" } },
      take: 5,
      where: { content_id: { not: null } },
    }),
    prisma.rating.groupBy({
      by: ["content_id"],
      _avg: { value: true },
      _count: { _all: true },
      orderBy: { _count: { content_id: "desc" } },
      take: 5,
      where: { ratingType: "STARS" },
    }),
    prisma.feedback.findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.chatbotQuery.findMany({
      orderBy: { created_at: "desc" },
      take: 6,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const [users, contents, merch, events, pending, ruleCount, bookmarks, ratings] = stats;

  // Resolve names for the "top content" lists.
  const bookmarkIds = topBookmarked.map((row) => row.content_id).filter(Boolean) as string[];
  const ratingIds = topRated.map((row) => row.content_id).filter(Boolean) as string[];
  const [bookmarkItems, ratingItems] = await Promise.all([
    prisma.content.findMany({ where: { id: { in: bookmarkIds } }, select: { id: true, title: true } }),
    prisma.content.findMany({ where: { id: { in: ratingIds } }, select: { id: true, title: true } }),
  ]);
  const bookmarkTitleById = new Map(bookmarkItems.map((item) => [item.id, item.title]));
  const ratingTitleById = new Map(ratingItems.map((item) => [item.id, item.title]));

  const submissionRows: SubmissionRow[] = submissions.map((submission) => ({
    id: submission.id,
    title: submission.title,
    body: submission.body,
    status: submission.status,
    createdAt: submission.created_at.toISOString(),
    author: submission.user.name,
    authorEmail: submission.user.email,
    category: submission.category?.name ?? null,
  }));

  const faqRows: FaqRow[] = faqs.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    keywords: faq.keywords,
  }));

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Admin" }]} />

      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
            Admin console
          </h1>
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {session.user.name}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Moderation, knowledge base and hub statistics.
        </p>
      </header>

      {/* Tab switcher */}
      <nav aria-label="Admin sections" className="flex flex-wrap gap-1 border-b border-rose-100 pb-px dark:border-rose-500/20">
        {TABS.map((item) => (
          <Button
            key={item}
            asChild
            variant={tab === item ? "secondary" : "ghost"}
            className={tab === item ? "rounded-b-none border-x border-t border-rose-100 dark:border-rose-500/20" : "rounded-b-none capitalize text-muted-foreground"}
            aria-current={tab === item ? "page" : undefined}
          >
            <Link href={`/admin?tab=${item}`}>{item}</Link>
          </Button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Registered fans" value={users} />
          <StatCard icon={Package} label="Catalogue items" value={contents} />
          <StatCard icon={Bookmark} label="Bookmarks" value={bookmarks} />
          <StatCard icon={Star} label="Ratings given" value={ratings} />
          <StatCard icon={Sparkles} label="Fan submissions" value={pending} alert={pending > 0} />
          <StatCard icon={MessageSquare} label="Bot rules" value={ruleCount} />
          <StatCard icon={Package} label="Merch items" value={merch} />
          <StatCard icon={Users} label="Events" value={events} />
        </div>
      ) : null}

      {tab === "submissions" ? <SubmissionsManager rows={submissionRows} /> : null}

      {tab === "faqs" ? <FaqManager rows={faqRows} /> : null}

      {tab === "usage" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Most bookmarked</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topBookmarked.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
              ) : (
                topBookmarked.map((row, index) =>
                  row.content_id ? (
                    <div key={row.content_id} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/content/${row.content_id}`} className="truncate hover:text-primary hover:underline">
                        {index + 1}. {bookmarkTitleById.get(row.content_id) ?? "Untitled"}
                      </Link>
                      <Badge variant="outline">{row._count._all}</Badge>
                    </div>
                  ) : null,
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top rated (stars)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topRated.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ratings yet.</p>
              ) : (
                topRated.map((row, index) =>
                  row.content_id ? (
                    <div key={row.content_id} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/content/${row.content_id}`} className="truncate hover:text-primary hover:underline">
                        {index + 1}. {ratingTitleById.get(row.content_id) ?? "Untitled"}
                      </Link>
                      <Badge variant="outline">
                        {(row._avg.value ?? 0).toFixed(1)} ★
                      </Badge>
                    </div>
                  ) : null,
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback submitted.</p>
              ) : (
                feedback.map((item) => (
                  <div key={item.id} className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">
                      {item.user.name} · {item.type.toLowerCase()} · {item.status.toLowerCase()}
                    </p>
                    <p className="mt-1 text-sm">{item.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent chat queries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody has asked anything yet.</p>
              ) : (
                recentQueries.map((item) => (
                  <div key={item.id} className="rounded-lg bg-muted/60 p-3">
                    <p className="text-sm">{item.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.user?.name ?? "Guest"} · {item.created_at.toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-amber-400 dark:border-amber-500/60" : undefined}>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-heading text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {label}
            {alert ? " · action needed" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}