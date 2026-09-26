// ---------------------------------------------------------------------------
// Fan Hub Plus — events queries  (/events)
// Upcoming events for the calendar list and the interactive map. Each event
// carries geocoded coordinates so the map can place a pin we can pop up.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";

export async function getUpcomingEvents() {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
    include: { category: { select: { name: true } } },
  });

  return events.map((event) => ({
    id: event.id,
    name: event.name,
    city: event.city,
    date: event.date.toISOString(),
    ticket_link: event.ticket_link,
    latitude: event.latitude,
    longitude: event.longitude,
    category: event.category,
  }));
}

// Event datetimes are stored as the wall-clock time an admin typed (see
// combineEventDate() in lib/validations/admin.ts), so they are formatted in UTC
// too. Without this the host timezone silently shifts every event by its
// offset — an 11:15 entry renders as 4:15 PM on a UTC+5 machine.
export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}
