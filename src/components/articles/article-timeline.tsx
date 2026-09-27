import { parseEventTimeline } from "@/lib/safe-html";

export function ArticleTimeline({ value }: { value: string | null | undefined }) {
  const entries = parseEventTimeline(value);
  if (!entries.length) return null;
  return <section aria-labelledby="timeline-heading" className="space-y-4">
    <h2 id="timeline-heading" className="text-2xl font-heading font-semibold tracking-wide">Timeline</h2>
    <ol className="space-y-4 border-l-2 border-accent pl-6">{entries.map((entry, index) => <li key={`${entry.date}-${index}`} className="space-y-1">
      {entry.date ? <p className="text-sm font-semibold text-accent">{entry.date}</p> : null}
      {entry.label ? <p className="font-medium">{entry.label}</p> : null}
      {entry.body ? <p className="text-sm text-muted-foreground">{entry.body}</p> : null}
    </li>)}</ol>
  </section>;
}
