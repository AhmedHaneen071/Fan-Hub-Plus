// ---------------------------------------------------------------------------
// Fan Hub Plus — events queries  (/events)
// Upcoming events for the calendar list and the interactive map. Each event
// carries geocoded coordinates so the map can place a pin we can pop up.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { z } from "zod";
export { formatEventDate } from "@/lib/event-format";

const filtersSchema = z.object({
  city: z.string().trim().max(80).optional().transform((value) => value || undefined),
  date: z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }).optional().transform((value) => value || undefined),
});

export async function getEventCities() {
  const rows = await prisma.event.findMany({ where: { date: { gte: new Date() } }, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } });
  return rows.map((row) => row.city);
}

export async function getUpcomingEvents(input: { city?: string; date?: string } = {}) {
  const parsed = filtersSchema.safeParse(input);
  const filters: { city?: string; date?: string } = parsed.success ? parsed.data : {};
  const selectedDate = filters.date ? new Date(`${filters.date}T00:00:00.000Z`) : null;
  const lowerBound = selectedDate && selectedDate > new Date() ? selectedDate : new Date();
  const events = await prisma.event.findMany({
    where: {
      date: { gte: lowerBound, ...(selectedDate ? { lt: new Date(selectedDate.getTime() + 86400000) } : {}) },
      ...(filters.city ? { city: { contains: filters.city } } : {}),
    },
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
