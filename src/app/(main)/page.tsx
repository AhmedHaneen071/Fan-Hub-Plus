import Link from "next/link";
import {
  Bookmark,
  CalendarDays,
  MapPin,
  MessageCircleQuestion,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHomeFeed } from "@/lib/queries/content";
import { getUpcomingContent } from "@/lib/queries/content";
import { HeroCarousel } from "@/components/content/hero-carousel";
import { ContentLane } from "@/components/content/content-lane";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { CategoryValue } from "@/lib/constants";

const highlights = [
  {
    icon: Bookmark,
    title: "Bookmark anything",
    body: "Content, characters and merch in one personal collection with private notes.",
  },
  {
    icon: Star,
    title: "Rate & rank",
    body: "Five stars or a quick thumbs up to shape community rankings across the hub.",
  },
  {
    icon: MapPin,
    title: "Events on a map",
    body: "Browse fandom events by city and date; request location access to see distances on the Live map.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask the hub",
    body: "A built-in FAQ chatbot answers platform questions instantly, day or night.",
  },
];

export const metadata = { title: "Home" };

export default async function HomePage() {
  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id }, select: { favoriteCategories: { select: { name: true } } },
  }) : null;
  const [feed, upcoming] = await Promise.all([
    getHomeFeed(user?.favoriteCategories.map((category) => category.name as CategoryValue) ?? []),
    getUpcomingContent(10),
  ]);

  return (
    <div className="flex flex-col">
      {/* --------------------------------------------- Prime-style hero reel */}
      <HeroCarousel slides={feed.hero} />

      <div className="mx-auto w-full max-w-7xl space-y-14 px-4 py-12 sm:px-6">
        {/* Category rail — quick horizontal browse */}
        <nav aria-label="Browse by fandom">
          <h2 className="sr-only">Browse every fandom</h2>
          <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {feed.categories.map((category) => (
              <li key={category.name} className="shrink-0">
                <Link
                  href={`/explore?category=${encodeURIComponent(category.name)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary dark:border-rose-500/25"
                >
                  {category.label}
                  <span className="text-xs font-normal text-muted-foreground">
                    {category.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content shelves */}
        <ContentLane
          title="Trending now"
          href="/explore?sort=popular"
          items={feed.trending}
        />
        <ContentLane
          title="Fresh on the hub"
          href="/explore?sort=latest"
          items={feed.latest}
        />
        {upcoming.length ? <ContentLane title="Coming soon" href="/upcoming" items={upcoming} /> : null}
        {feed.categoryLanes.map((lane) => (
          <ContentLane
            key={lane.categoryId}
            title={lane.categoryLabel}
            href={`/explore?category=${encodeURIComponent(lane.categoryName)}`}
            items={lane.items}
          />
        ))}
      </div>

      {/* Why Fan Hub Plus */}
      <section className="border-y bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-heading text-3xl sm:text-4xl">
              Everything in one hub
            </h2>
            <p className="mt-3 text-muted-foreground">
              Browse like a streamer, then book, rate and track like a fan. One
              clean rose-and-ink system on every screen.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border bg-background p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events strip */}
      <section className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
        <div className="max-w-md space-y-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CalendarDays className="size-5" aria-hidden="true" />
          </div>
          <h2 className="font-heading text-3xl">Never miss a convention</h2>
          <p className="text-muted-foreground">
            Scrub the event calendar by city, grab ticket links and follow the
            Live map to explore events by city, date, and optional location.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/events">View event calendar</Link>
        </Button>
      </section>
    </div>
  );
}
