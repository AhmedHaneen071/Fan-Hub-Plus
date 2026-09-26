// ---------------------------------------------------------------------------
// Fan Hub Plus — events map loader (client)
// Leaflet reaches for `window` at module scope, so the map cannot be part of
// the server render. This wrapper defers it to the browser and holds the same
// box open while it loads, which keeps /events server-rendered.
// ---------------------------------------------------------------------------

"use client";

import dynamic from "next/dynamic";

const EventsMap = dynamic(
  () => import("@/components/events/events-map").then((mod) => mod.EventsMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[420px] w-full overflow-hidden rounded-2xl border bg-muted/40 skeleton"
        role="status"
        aria-label="Loading the events map"
      />
    ),
  }
);

export { EventsMap };
