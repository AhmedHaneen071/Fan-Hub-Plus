// ---------------------------------------------------------------------------
// Fan Hub Plus — events map (client)  (Phase 9b)
// react-leaflet map of upcoming events. Markers are styled divIcons (no icon
// asset bundling to fight), each with a popup linking to the ticket page.
// The map recenters once data arrives via the key prop on the server page.
// ---------------------------------------------------------------------------

"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatEventDate } from "@/lib/queries/events";

type MapEvent = {
  id: string;
  name: string;
  city: string;
  date: string;
  ticket_link: string | null;
  latitude: number;
  longitude: number;
  category: { name: string } | null;
};

const PIN_COLORS = ["#E11D48", "#2563EB", "#FB7185", "#0F766E", "#7C3AED"];

function pinIcon(index: number): L.DivIcon {
  const color = PIN_COLORS[index % PIN_COLORS.length];
  return L.divIcon({
    className: "fh-pin",
    html: `<span style="background:${color}"></span>`,
    iconSize: [26, 34],
    iconAnchor: [13, 32],
    popupAnchor: [0, -30],
  });
}

export function EventsMap({ events }: { events: MapEvent[] }) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border shadow-sm">
      <MapContainer
        center={[20, 10]}
        zoom={2}
        scrollWheelZoom={false}
        className="z-0 h-full w-full"
        aria-label="Map of upcoming Fan Hub Plus events"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {events.map((event, index) => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={pinIcon(index)}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{event.name}</p>
                <p className="text-muted-foreground">
                  {event.city} · {formatEventDate(event.date)}
                </p>
                {event.ticket_link ? (
                  <a
                    href={event.ticket_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Get tickets ↗
                  </a>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}