"use client";

import { useState } from "react";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { EventsMap } from "@/components/events/events-map-loader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import { formatEventDate } from "@/lib/event-format";

type EventRow = { id: string; name: string; city: string; date: string; ticket_link: string | null; latitude: number; longitude: number; category: { name: string } | null };
function distanceKm(from: [number, number], to: [number, number]) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(to[0] - from[0]); const dLon = rad(to[1] - from[1]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from[0])) * Math.cos(rad(to[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function EventsBrowser({ events }: { events: EventRow[] }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [nearest, setNearest] = useState(false);
  const rows = position && nearest ? [...events].sort((a, b) => distanceKm(position, [a.latitude, a.longitude]) - distanceKm(position, [b.latitude, b.longitude])) : events;
  return <>
    <EventsMap events={events} onLocationChange={setPosition} key={events.map((event) => event.id).join("-")} />
    {position ? <div className="flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">Approximate distances from your location.</span><button type="button" className="rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setNearest((value) => !value)}>{nearest ? "Sort by date" : "Sort by distance"}</button></div> : null}
    {events.length === 0 ? <div className="rounded-2xl border border-dashed py-16 text-center"><CalendarDays className="mx-auto size-10 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm text-muted-foreground">No upcoming events match these filters.</p></div> : <ul className="grid gap-4 sm:grid-cols-2">{rows.map((event) => <li key={event.id}><Card className="h-full"><CardContent className="space-y-3"><div className="flex items-start justify-between gap-3"><h2 className="font-heading text-lg font-semibold">{event.name}</h2><Badge variant="secondary">{event.category ? CATEGORY_LABELS[event.category.name as CategoryValue] ?? event.category.name : "General"}</Badge></div><p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" aria-hidden="true" />{formatEventDate(event.date)}</p><p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden="true" />{event.city}{position ? ` · ${distanceKm(position, [event.latitude, event.longitude]).toFixed(0)} km away` : ""}</p>{event.ticket_link ? <a href={event.ticket_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><Ticket className="size-4" aria-hidden="true" />Ticket information ↗</a> : null}</CardContent></Card></li>)}</ul>}
  </>;
}
