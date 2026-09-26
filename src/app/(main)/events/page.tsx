// ---------------------------------------------------------------------------
// Fan Hub Plus — event calendar & map  (/events)
// Upcoming fan events listed by date with ticket links, plus an interactive
// map (Phase 9b) with a pin for each city on the list.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { EventsMap } from "@/components/events/events-map-loader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getUpcomingEvents, formatEventDate } from "@/lib/queries/events";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming Fan Hub Plus events by city, with tickets and a map.",
};

export default async function EventsPage() {
  const events = await getUpcomingEvents();

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Events" }]} />

      <header className="space-y-1">
        <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
          Event calendar
        </h1>
        <p className="text-muted-foreground">
          Fan gatherings, screenings and shows — pick your city, get your ticket.
        </p>
      </header>

      <EventsMap events={events} key={events.map((event) => event.id).join("-")} />

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <CalendarDays className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            No upcoming events right now — check back soon.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-heading text-lg font-semibold tracking-wide">
                      {event.name}
                    </h2>
                    <Badge variant="secondary" className="shrink-0">
                      {event.category
                        ? CATEGORY_LABELS[event.category.name as CategoryValue] ??
                          event.category.name
                        : "General"}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {formatEventDate(event.date)}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4" aria-hidden="true" />
                    {event.city}
                  </p>
                  {event.ticket_link ? (
                    <a
                      href={event.ticket_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Ticket className="size-4" aria-hidden="true" />
                      Get tickets ↗
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}