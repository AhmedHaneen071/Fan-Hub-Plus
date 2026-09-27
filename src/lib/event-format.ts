/** Event records are formatted in UTC so host timezone does not shift their displayed time. */
export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));
}
