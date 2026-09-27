// ---------------------------------------------------------------------------
// Fan Hub Plus — events map (client)  (Phase 9b)
// react-leaflet map of upcoming events. Markers are styled divIcons (no icon
// asset bundling to fight), each with a popup linking to the ticket page.
// The map recenters once data arrives via the key prop on the server page.
// ---------------------------------------------------------------------------

"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import { formatEventDate } from "@/lib/event-format";

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
const USER_ICON = L.divIcon({ className: "fh-pin", html: '<span style="background:#0284c7"></span>', iconSize: [26, 34], iconAnchor: [13, 32] });

function distanceKm(from: [number, number], to: [number, number]) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(to[0] - from[0]);
  const dLon = radians(to[1] - from[1]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from[0])) * Math.cos(radians(to[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function RecenterOnLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (position) map.flyTo(position, 7, { duration: 0.5 }); }, [map, position]);
  return null;
}

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

export function EventsMap({ events, onLocationChange }: { events: MapEvent[]; onLocationChange?: (position: [number, number]) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("");
  function locate() {
    if (!navigator.geolocation) { setMessage("Location is not supported by this browser."); return; }
    setMessage("Requesting location permission…");
    navigator.geolocation.getCurrentPosition(
      (result) => { const coords: [number, number] = [result.coords.latitude, result.coords.longitude]; setPosition(coords); onLocationChange?.(coords); setMessage("Your location is shown. Distances are approximate."); },
      () => setMessage("Location is unavailable or permission was denied. Browse by city and date instead."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }
  return (
    <section aria-label="Upcoming event map" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={locate}>Use my location</Button>
        <p aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="h-[420px] w-full overflow-hidden rounded-2xl border shadow-sm">
      <MapContainer
        center={[20, 10]}
        zoom={2}
        scrollWheelZoom={false}
        className="z-0 h-full w-full"
        aria-label="Map of upcoming Fan Hub Plus events"
        keyboard
      >
        <RecenterOnLocation position={position} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position ? <Marker position={position} icon={USER_ICON} keyboard alt="Your location"><Popup>Your location</Popup></Marker> : null}
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
                {position ? <p>{distanceKm(position, [event.latitude, event.longitude]).toFixed(0)} km away</p> : null}
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
    </section>
  );
}
