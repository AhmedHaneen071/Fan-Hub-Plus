import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { EventsBrowser } from "@/components/events/events-browser";
import { getEventCities, getUpcomingEvents } from "@/lib/queries/events";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming Fan Hub Plus events by city, with tickets and a map.",
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const city = typeof params.city === "string" && params.city.length <= 80 ? params.city : undefined;
  const date = typeof params.date === "string" && params.date.length <= 10 ? params.date : undefined;
  const [events, cities] = await Promise.all([getUpcomingEvents({ city, date }), getEventCities()]);
  return <div className="space-y-8">
    <Breadcrumbs crumbs={[{ label: "Events" }]} />
    <header className="space-y-1"><h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">Event calendar</h1><p className="text-muted-foreground">Fan gatherings, screenings, and shows. Browse by city or date, or request location access to sort by distance.</p></header>
    <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <label className="space-y-1 text-sm font-medium">City<select name="city" defaultValue={city ?? ""} className="h-10 w-full rounded-lg border bg-background px-3 font-normal"><option value="">All cities</option>{cities.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Date<input type="date" name="date" defaultValue={date ?? ""} className="h-10 w-full rounded-lg border bg-background px-3 font-normal" /></label>
      <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Apply filters</button><a href="/events" className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm">Clear</a>
    </form>
    <EventsBrowser events={events} />
  </div>;
}
