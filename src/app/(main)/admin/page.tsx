// ---------------------------------------------------------------------------
// Fan Hub Plus — admin area  (/admin)   (Phase 11)
// Role-gated management console: overview stats, the fan-submission
// moderation queue, the chatbot knowledge base, usage numbers and — since
// Phase 2 — CRUD for the catalogue itself. Only an ADMIN session may proceed;
// the guard repeats on every server action.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, MessageSquare, Package, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { SUSPENDED_PATH, isSuspended } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import {
  SubmissionsManager,
  type SubmissionRow,
} from "@/components/admin/submissions-manager";
import { FaqManager, type FaqRow } from "@/components/admin/faq-manager";
import { ContentManager, type ContentRow } from "@/components/admin/content-manager";
import { MerchManager, type MerchRow } from "@/components/admin/merch-manager";
import { EventManager, type EventRow } from "@/components/admin/event-manager";
import { CharacterManager, type CharacterRow } from "@/components/admin/character-manager";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";
import { ArticleManager, type ArticleRow } from "@/components/admin/article-manager";
import {
  FeedbackManager,
  type FeedbackAdminRow,
} from "@/components/admin/feedback-manager";
import { UserManager, type UserAdminRow } from "@/components/admin/user-manager";

import type { CategoryOption } from "@/components/admin/manager-parts";
import { parseEventTimeline } from "@/lib/safe-html";
import {
  readListParams,
  resolveWindow,
  type ListParams,
  type PageWindow,
} from "@/lib/list-params";
import { ListControls } from "@/components/admin/list-controls";

import {
  FEEDBACK_STATUSES,
  type FeedbackStatus,
} from "@/lib/validations/admin";

export const metadata: Metadata = {
  title: "Admin",
  description: "Fan Hub Plus administration.",
};

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "submissions", label: "Submissions" },
  { value: "faqs", label: "Bot rules" },
  { value: "content", label: "Content" },
  { value: "merch", label: "Merch" },
  { value: "events", label: "Events" },
  { value: "characters", label: "Characters" },
  { value: "articles", label: "Articles" },
  { value: "feedback", label: "Feedback" },
  { value: "users", label: "Users" },
  { value: "fandoms", label: "Fandoms" },

  { value: "usage", label: "Usage" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const TAB_VALUES = TABS.map((item) => item.value) as readonly string[];

// A catalogue tab used to fetch the first LIST_LIMIT rows and stop, so an admin
// could never reach an older entry. Every unbounded list now pages through the
// whole set and filters it; see lib/list-params.ts. The reference sets (the
// eight fandoms, the chatbot rules) still load in full because the schema
// bounds them.


type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // A suspended admin is turned away here as well as in the actions: the role is
  // still ADMIN, so without this check the console would render and only fail
  // on the first click.
  if (isSuspended(session)) redirect(SUSPENDED_PATH);
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const raw = await searchParams;
  const requested = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  const tab: Tab = TAB_VALUES.includes(requested ?? "")
    ? (requested as Tab)
    : "overview";

  // One set of paging parameters is read for the whole page and handed to
  // whichever loader the active tab needs, so `?q=` and `?page=` behave the same
  // on every list.
  const list = readListParams({ q: raw.q, page: raw.page });

  // Only the active tab is loaded. This page used to run one big Promise.all
  // for every panel regardless of which tab was open, so opening "Bot rules"
  // still counted users, grouped ratings and pulled the submission queue.
  const [
    overview,
    submissions,
    faqs,
    contentList,
    merchList,
    eventList,
    characterList,
    articleList,
    feedbackList,
    userList,
    categoryList,
    usage,
    categories,
  ] = await Promise.all([
    tab === "overview" ? loadOverview() : null,
    tab === "submissions" ? loadSubmissions() : null,
    tab === "faqs" ? loadFaqs() : null,
    tab === "content" ? loadContentList(list) : null,
    tab === "merch" ? loadMerchList(list) : null,
    tab === "events" ? loadEventList(list) : null,
    tab === "characters" ? loadCharacterList(list) : null,
    tab === "articles" ? loadArticleList(list) : null,
    tab === "feedback" ? loadFeedbackList(list) : null,
    tab === "users" ? loadUserList(list) : null,

    tab === "fandoms" ? loadCategoryList() : null,
    tab === "usage" ? loadUsage() : null,
    needsCategories(tab) ? loadCategories() : null,
  ]);



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
          Moderation, knowledge base, catalogue management and hub statistics.
        </p>
      </header>

      {/* Tab switcher */}
      <nav aria-label="Admin sections" className="flex flex-wrap gap-1 border-b border-rose-100 pb-px dark:border-rose-500/20">
        {TABS.map((item) => (
          <Button
            key={item.value}
            asChild
            variant={tab === item.value ? "secondary" : "ghost"}
            className={tab === item.value ? "rounded-b-none border-x border-t border-rose-100 dark:border-rose-500/20" : "rounded-b-none text-muted-foreground"}
            aria-current={tab === item.value ? "page" : undefined}
          >
            <Link href={`/admin?tab=${item.value}`}>{item.label}</Link>
          </Button>
        ))}
      </nav>

      {overview ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Registered fans" value={overview.users} />
          <StatCard icon={Package} label="Catalogue items" value={overview.contents} />
          <StatCard icon={Bookmark} label="Bookmarks" value={overview.bookmarks} />
          <StatCard icon={Star} label="Ratings given" value={overview.ratings} />
          <StatCard
            icon={Sparkles}
            label="Fan submissions"
            value={overview.pending}
            alert={overview.pending > 0}
          />
          <StatCard icon={MessageSquare} label="Bot rules" value={overview.ruleCount} />
          <StatCard icon={Package} label="Merch items" value={overview.merch} />
          <StatCard icon={Users} label="Events" value={overview.events} />
        </div>
      ) : null}

      {submissions ? <SubmissionsManager rows={submissions} /> : null}

      {faqs && categories ? <FaqManager rows={faqs} categories={categories} /> : null}

      {contentList && categories ? (
        <>
          <ListControls
            tab="content"
            query={list.q}
            range={resolveWindow(list, contentList.total)}
            searchLabel="titles and descriptions"
          />
          <ContentManager
            rows={contentList.rows}
            total={contentList.total}
            categories={categories}
          />
        </>
      ) : null}

      {merchList && categories ? (
        <>
          <ListControls
            tab="merch"
            query={list.q}
            range={resolveWindow(list, merchList.total)}
            searchLabel="item names and tags"
          />
          <MerchManager rows={merchList.rows} total={merchList.total} categories={categories} />
        </>
      ) : null}

      {eventList && categories ? (
        <>
          <ListControls
            tab="events"
            query={list.q}
            range={resolveWindow(list, eventList.total)}
            searchLabel="event names and cities"
          />
          <EventManager rows={eventList.rows} total={eventList.total} categories={categories} />
        </>
      ) : null}

      {characterList && categories ? (
        <>
          <ListControls
            tab="characters"
            query={list.q}
            range={resolveWindow(list, characterList.total)}
            searchLabel="character names"
          />
          <CharacterManager
            rows={characterList.rows}
            total={characterList.total}
            categories={categories}
          />
        </>
      ) : null}

      {feedbackList ? (
        <>
          <ListControls
            tab="feedback"
            query={list.q}
            range={resolveWindow(list, feedbackList.total)}
            searchLabel="message text"
          />
          <FeedbackManager
            rows={feedbackList.rows}
            total={feedbackList.total}
            openCount={feedbackList.openCount}
          />
        </>
      ) : null}

      {userList ? (
        <>
          <ListControls
            tab="users"
            query={list.q}
            range={resolveWindow(list, userList.total)}
            searchLabel="names and emails"
          />
          <UserManager
            rows={userList.rows}
            selfId={session.user.id}
            adminCount={userList.adminCount}
          />
        </>
      ) : null}

      {categoryList ? (
        <CategoryManager rows={categoryList.rows} total={categoryList.total} />
      ) : null}

      {articleList && categories ? (
        <>
          <ListControls
            tab="articles"
            query={list.q}
            range={resolveWindow(list, articleList.total)}
            searchLabel="article titles"
          />
          <ArticleManager
            rows={articleList.rows}
            total={articleList.total}
            categories={categories}
          />
        </>
      ) : null}


      {usage ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="lg:col-span-2"><CardHeader><CardTitle>Usage overview</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-2xl font-bold">{usage.activeUsers}</p><p className="text-sm text-muted-foreground">Active users · last {usage.activeWindowDays} days</p></div>
            <div><p className="text-2xl font-bold">{usage.chatbotInteractions}</p><p className="text-sm text-muted-foreground">Chatbot interactions · last {usage.activeWindowDays} days</p></div>
            <div><p className="text-sm font-semibold">Popular categories</p>{usage.popularCategories.length ? usage.popularCategories.map((category) => <p key={category.name} className="text-sm text-muted-foreground">{category.name.replaceAll("_", " ")} · {category.count} items</p>) : <p className="text-sm text-muted-foreground">No catalogue records yet.</p>}</div>
          </CardContent></Card>
          <Card>
            <CardHeader>
              <CardTitle>Most bookmarked</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {usage.topBookmarked.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
              ) : (
                usage.topBookmarked.map((row, index) => (
                  <div key={row.content_id} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/content/${row.content_id}`}
                      className="truncate hover:text-primary hover:underline"
                    >
                      {index + 1}. {usage.bookmarkTitles.get(row.content_id) ?? "Untitled"}
                    </Link>
                    <Badge variant="outline">{row.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top rated (stars)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {usage.topRated.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ratings yet.</p>
              ) : (
                usage.topRated.map((row, index) => (
                  <div key={row.content_id} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/content/${row.content_id}`}
                      className="truncate hover:text-primary hover:underline"
                    >
                      {index + 1}. {usage.ratingTitles.get(row.content_id) ?? "Untitled"}
                    </Link>
                    <Badge variant="outline">{row.average.toFixed(1)} ★</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {usage.openFeedback === 0
                  ? "Nothing unresolved. Members send feedback from their dashboard."
                  : `${usage.openFeedback} message${usage.openFeedback === 1 ? "" : "s"} still waiting for a reply.`}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin?tab=feedback">Open the queue</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent chat queries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {usage.recentQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody has asked anything yet.</p>
              ) : (
                usage.recentQueries.map((item) => (
                  <div key={item.id} className="rounded-lg bg-muted/60 p-3">
                    <p className="text-sm">{item.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.author} · {item.createdAt}
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

/** Tabs whose form writes a category foreign key, so they need the picker data. */
function needsCategories(tab: Tab): boolean {
  return (
    tab === "content" ||
    tab === "faqs" ||
    tab === "merch" ||
    tab === "events" ||
    tab === "characters" ||
    tab === "articles"
  );
}


// ------------------------------------------------------------------- loaders
async function loadOverview() {
  const [users, contents, merch, events, pending, ruleCount, bookmarks, ratings] =
    await prisma.$transaction([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.content.count(),
      prisma.merchandiseItem.count(),
      prisma.event.count(),
      prisma.fanSubmission.count({ where: { status: "PENDING" } }),
      prisma.chatbotFAQ.count(),
      prisma.bookmark.count(),
      prisma.rating.count(),
    ]);
  return { users, contents, merch, events, pending, ruleCount, bookmarks, ratings };
}

async function loadSubmissions(): Promise<SubmissionRow[]> {
  const submissions = await prisma.fanSubmission.findMany({
    orderBy: { created_at: "desc" },
    take: 30,
    include: { user: { select: { name: true, email: true } }, category: { select: { name: true } } },
  });

  const reviewerIds = [...new Set(submissions.map((row) => row.reviewed_by).filter((id): id is string => Boolean(id)))];
  const reviewers = reviewerIds.length ? await prisma.user.findMany({
    where: { id: { in: reviewerIds } }, select: { id: true, name: true },
  }) : [];
  const reviewerNames = new Map(reviewers.map((row) => [row.id, row.name]));

  return submissions.map((submission) => ({
    id: submission.id,
    title: submission.title,
    body: submission.body,
    status: submission.status,
    createdAt: submission.created_at.toISOString(),
    author: submission.user.name,
    authorEmail: submission.user.email,
    category: submission.category?.name ?? null,
    type: submission.type,
    reviewedBy: submission.reviewed_by ? reviewerNames.get(submission.reviewed_by) ?? "Former admin" : null,
  }));
}

async function loadFaqs(): Promise<FaqRow[]> {
  const faqs = await prisma.chatbotFAQ.findMany({
    orderBy: { created_at: "asc" },
    include: { category: { select: { id: true, name: true } } },
  });
  return faqs.map((faq) => ({
    id: faq.id,
    category_id: faq.category?.id ?? null,
    category_name: faq.category?.name ?? null,
    question: faq.question,
    answer: faq.answer,
    keywords: faq.keywords,
  }));
}

async function loadCategories(): Promise<CategoryOption[]> {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return categories;
}

/**
 * A requested page can point past the end of the set: a hand-edited URL, or rows
 * deleted while the admin was sitting on the last page. resolveWindow() clamps
 * the label, so without this the list would read "Page 6 of 6" above an empty
 * body. The re-query only happens on that rare path, which keeps the common case
 * at a single round trip.
 */
async function settlePage<T>(
  requested: ListParams,
  window: PageWindow,
  first: T[],
  refetch: () => Promise<T[]>
): Promise<T[]> {
  return first.length === 0 && requested.page > window.page ? refetch() : first;
}

async function loadContentList(list: ListParams): Promise<{ rows: ContentRow[]; total: number }> {
  // Content.type is a Prisma enum, so it cannot be matched with `contains` and
  // is not searched here; a text search across a fixed enum would need an exact
  // match anyway, which the type picker already does.
  const where: Prisma.ContentWhereInput = list.term
    ? {
        OR: [
          { title: { contains: list.term } },
          { description: { contains: list.term } },
          { tags: { contains: list.term } },
        ],
      }
    : {};

  const fetchRows = (skip: number) =>
    prisma.content.findMany({
      where,
      orderBy: [{ popularity_score: "desc" }, { title: "asc" }],
      skip,
      take: list.take,
      include: {
        category: { select: { name: true } },
        _count: { select: { bookmarks: true, ratings: true } },
      },
    });

  const [first, total] = await Promise.all([fetchRows(list.skip), prisma.content.count({ where })]);
  const window = resolveWindow(list, total);
  const rows = await settlePage(list, window, first, () =>
    fetchRows((window.page - 1) * list.pageSize)
  );

  return {

    total,
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      tags: row.tags,
      genre: row.genre,
      description: row.description,
      release_date: row.release_date,
      media_url: row.media_url,
      trailer_url: row.trailer_url,
      popularity_score: row.popularity_score,
      is_upcoming: row.is_upcoming,
      category_id: row.category_id,
      category_name: row.category.name,
      bookmarks: row._count.bookmarks,
      ratings: row._count.ratings,
    })),
  };
}

async function loadMerchList(list: ListParams): Promise<{ rows: MerchRow[]; total: number }> {
  // The primary merchandise tag is a Prisma enum; free-form discovery tags
  // are searchable alongside the item name.
  const where: Prisma.MerchandiseItemWhereInput = list.term
    ? { OR: [{ name: { contains: list.term } }, { tags: { contains: list.term } }] }
    : {};

  const fetchRows = (skip: number) =>
    prisma.merchandiseItem.findMany({
      where,
      orderBy: [{ is_upcoming: "desc" }, { created_at: "desc" }],
      skip,
      take: list.take,
      include: { category: { select: { name: true } }, _count: { select: { bookmarks: true } } },
    });

  const [first, total] = await Promise.all([
    fetchRows(list.skip),
    prisma.merchandiseItem.count({ where }),
  ]);
  const window = resolveWindow(list, total);
  const rows = await settlePage(list, window, first, () =>
    fetchRows((window.page - 1) * list.pageSize)
  );


  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      image_url: row.image_url,
      tag: row.tag,
      tags: row.tags,
      is_upcoming: row.is_upcoming,
      view_count: row.view_count,
      // Prisma Decimal -> a plain string the price input can hold.
      price: row.price === null ? null : row.price.toString(),
      category_id: row.category_id,
      category_name: row.category.name,
      bookmarks: row._count.bookmarks,
    })),
  };
}

async function loadEventList(list: ListParams): Promise<{ rows: EventRow[]; total: number }> {
  const where: Prisma.EventWhereInput = list.term
    ? { OR: [{ name: { contains: list.term } }, { city: { contains: list.term } }] }
    : {};

  const fetchRows = (skip: number) =>
    prisma.event.findMany({
      where,
      orderBy: { date: "asc" },
      skip,
      take: list.take,
      include: { category: { select: { name: true } } },
    });

  const [first, total] = await Promise.all([fetchRows(list.skip), prisma.event.count({ where })]);
  const window = resolveWindow(list, total);
  const rows = await settlePage(list, window, first, () =>
    fetchRows((window.page - 1) * list.pageSize)
  );


  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      date: row.date,
      ticket_link: row.ticket_link,
      latitude: row.latitude,
      longitude: row.longitude,
      category_id: row.category_id,
      category_name: row.category?.name ?? null,
    })),
  };
}

async function loadCharacterList(list: ListParams): Promise<{ rows: CharacterRow[]; total: number }> {
  const where: Prisma.CharacterProfileWhereInput = list.term
    ? { name: { contains: list.term } }
    : {};

  const fetchRows = (skip: number) =>
    prisma.characterProfile.findMany({
      where,
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      skip,
      take: list.take,
      include: { category: { select: { name: true } }, _count: { select: { bookmarks: true } } },
    });

  const [first, total] = await Promise.all([
    fetchRows(list.skip),
    prisma.characterProfile.count({ where }),
  ]);
  const window = resolveWindow(list, total);
  const rows = await settlePage(list, window, first, () =>
    fetchRows((window.page - 1) * list.pageSize)
  );


  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      bio: row.bio,
      image_url: row.image_url,
      category_id: row.category_id,
      category_name: row.category.name,
      bookmarks: row._count.bookmarks,
    })),
  };
}

async function loadArticleList(list: ListParams): Promise<{ rows: ArticleRow[]; total: number }> {
  const where: Prisma.FeaturedArticleWhereInput = list.term
    ? { title: { contains: list.term } }
    : {};

  const fetchRows = (skip: number) =>
    prisma.featuredArticle.findMany({
      where,
      orderBy: [{ category: { name: "asc" } }, { title: "asc" }],
      skip,
      take: list.take,
      include: { category: { select: { name: true } } },
    });

  const [first, total] = await Promise.all([
    fetchRows(list.skip),
    prisma.featuredArticle.count({ where }),
  ]);
  const window = resolveWindow(list, total);
  const rows = await settlePage(list, window, first, () =>
    fetchRows((window.page - 1) * list.pageSize)
  );


  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      cover_image: row.cover_image,
      category_id: row.category_id,
      category_name: row.category.name,
      rich_text_body: row.rich_text_body,
      event_timeline: row.event_timeline,
      timelineCount: parseEventTimeline(row.event_timeline).length,
    })),
  };
}

async function loadFeedbackList(list: ListParams): Promise<{
  rows: FeedbackAdminRow[];
  total: number;
  openCount: number;
}> {
  const where: Prisma.FeedbackWhereInput = list.term
    ? { message: { contains: list.term } }
    : {};

  // The queue is fetched oldest-first so the paging is stable, then the rows of
  // the page that came back are partitioned unresolved-first. Because
  // Array.sort is stable, the within-group order stays chronological. The sort
  // is per page, not global: across page boundaries an admin can still meet a
  // resolved row above an unresolved one, which is why the pager reports the
  // range rather than promising a strict queue.
  const fetchRows = (skip: number) =>
    prisma.feedback.findMany({
      where,
      orderBy: [{ created_at: "asc" }],
      skip,
      take: list.take,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

  const [first, total, openCount] = await Promise.all([
    fetchRows(list.skip),
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: { status: { not: "RESOLVED" } } }),
  ]);
  const window = resolveWindow(list, total);
  const rows = await settlePage(list, window, first, () =>
    fetchRows((window.page - 1) * list.pageSize)
  );


  return {
    total,
    openCount,
    // Unresolved before resolved: a new message must not push an old one off
    // the top of the screen an admin is working through.
    rows: rows
      .map((row) => ({
        id: row.id,
        type: row.type,
        message: row.message,
        status: FEEDBACK_STATUSES.includes(row.status as never)
          ? (row.status as FeedbackStatus)
          : "OPEN",
        createdAt: row.created_at.toISOString(),
        user: row.user,
      }))
      .sort((a, b) => {
        const rank = (status: FeedbackStatus) => (status === "RESOLVED" ? 1 : 0);
        const difference = rank(a.status) - rank(b.status);
        if (difference !== 0) return difference;
        return a.createdAt.localeCompare(b.createdAt);
      }),
  };
}

async function loadUserList(list: ListParams): Promise<{
  rows: UserAdminRow[];
  total: number;
  adminCount: number;
}> {
  const now = new Date();
  const where: Prisma.UserWhereInput = list.term
    ? { OR: [{ name: { contains: list.term } }, { email: { contains: list.term } }] }
    : {};

  const fetchRows = (skip: number) =>
    prisma.user.findMany({
      where,
      // Newest joiners first, straight from the database. A live suspension
      // could be filtered with `suspended_until: { gt: now }`, but that would
      // drop the *expired* suspensions from the list while `total` still counted
      // them, leaving the pager describing rows nobody can see. They are shown as
      // unsuspended instead, which keeps the count and the rows in agreement.
      // A suspended row carries a badge rather than floating to the top, because
      // sorting it to the top is only true within one page and the pager does not
      // keep that order across pages. Search still finds it by name or address.
      orderBy: [{ created_at: "desc" }],
      skip,
      take: list.take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        suspended_until: true,
        suspension_reason: true,
        _count: { select: { bookmarks: true, submissions: true, feedback: true } },
      },
    });

  const [first, total, adminCount] = await Promise.all([
    fetchRows(list.skip),
    prisma.user.count({ where }),
    // The admin count is deliberately NOT filtered by the search: the
    // last-admin guard depends on the real total, and "3 admins, 1 matching your
    // search" would be a confusing thing to show next to the role picker.
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);
  const window = resolveWindow(list, total);
  const rows = await settlePage(list, window, first, () =>
    fetchRows((window.page - 1) * list.pageSize)
  );

  const mapped = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    // An expired window reads as "not suspended", which is what the session
    // callback does too — the ban lifts itself.
    suspendedUntil:
      row.suspended_until && row.suspended_until > now
        ? row.suspended_until.toISOString()
        : null,
    suspensionReason: row.suspension_reason,
    counts: {
      bookmarks: row._count.bookmarks,
      submissions: row._count.submissions,
      feedback: row._count.feedback,
    },
  }));

  return { total, adminCount, rows: mapped };
}

async function loadCategoryList(): Promise<{ rows: CategoryRow[]; total: number }> {  const [rows, total] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { contents: true, characterProfiles: true, merchandiseItems: true, events: true },
        },
      },
    }),
    prisma.category.count(),
  ]);

  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      cover_image: row.cover_image,
      featured: row.featured,
      counts: {
        contents: row._count.contents,
        characters: row._count.characterProfiles,
        merch: row._count.merchandiseItems,
        events: row._count.events,
      },
    })),
  };
}

async function loadUsage() {
  const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [topBookmarked, topRated, openFeedback, recentQueries, activeUsers, chatbotInteractions, popularCategories] = await Promise.all([
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
      orderBy: { _count: { content_id: "desc" } },
      take: 5,
      where: { ratingType: "STARS" },
    }),
    prisma.feedback.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.chatbotQuery.findMany({
      orderBy: { created_at: "desc" },
      take: 6,
      include: { user: { select: { name: true } } },
    }),
    prisma.user.count({ where: { role: { in: ["USER", "ADMIN"] }, last_seen: { gte: activeSince } } }),
    prisma.chatbotQuery.count({ where: { created_at: { gte: activeSince } } }),
    prisma.content.groupBy({ by: ["category_id"], _count: { _all: true }, orderBy: { _count: { category_id: "desc" } }, take: 8 }),
  ]);

  // groupBy returns content_id as string | null; both lists are filtered to
  // non-null above, so the cast matches the query that produced it.
  const bookmarkIds = topBookmarked.map((row) => row.content_id as string);
  const ratingIds = topRated.map((row) => row.content_id as string);

  const categoryIds = popularCategories.map((row) => row.category_id);
  const [bookmarkItems, ratingItems, popularCategoryRows] = await Promise.all([
    prisma.content.findMany({
      where: { id: { in: bookmarkIds } },
      select: { id: true, title: true },
    }),
    prisma.content.findMany({
      where: { id: { in: ratingIds } },
      select: { id: true, title: true },
    }),
    prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }),
  ]);
  const categoryNames = new Map(popularCategoryRows.map((row) => [row.id, row.name]));

  return {
    topBookmarked: topBookmarked.map((row) => ({
      content_id: row.content_id as string,
      count: row._count._all,
    })),
    topRated: topRated.map((row) => ({
      content_id: row.content_id as string,
      average: row._avg.value ?? 0,
    })),
    bookmarkTitles: new Map(bookmarkItems.map((item) => [item.id, item.title])),
    ratingTitles: new Map(ratingItems.map((item) => [item.id, item.title])),
    openFeedback,
    activeUsers,
    activeWindowDays: 30,
    chatbotInteractions,
    popularCategories: popularCategories.map((row) => ({ name: categoryNames.get(row.category_id) ?? "Unknown", count: row._count._all })),
    recentQueries: recentQueries.map((item) => ({
      id: item.id,
      message: item.message,
      author: item.user?.name ?? "Guest",
      createdAt: item.created_at.toLocaleString(),
    })),
  };
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
