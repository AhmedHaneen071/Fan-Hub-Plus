// ---------------------------------------------------------------------------
// Fan Hub Plus — allow-listed HTML for article bodies
//
// `FeaturedArticle.rich_text_body` stores HTML an admin typed, and it is about
// to be rendered on a public page for every visitor. Rendering it with
// dangerouslySetInnerHTML as-is would make the admin account an XSS delivery
// mechanism against every reader, so the output is rebuilt from an allow-list
// instead of being filtered: anything not named here never reaches the DOM.
//
// No sanitizer dependency is added. The subset is deliberately small (prose
// formatting, lists, headings, links, images) and everything else is dropped.
// ---------------------------------------------------------------------------

/** Tags a body may use. Anything absent is discarded. */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "code",
  "pre",
  "hr",
]);

/**
 * Tags whose *content* must go too, not just their tags. Their bodies are
 * executable or style-bearing, so unwrapping them would leak script text into
 * the page as visible content.
 */
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "template", "noscript"]);

/** Tags that never have a closing partner. */
const VOID_TAGS = new Set(["br", "img", "hr"]);

/** Attributes kept per tag. `a` and `img` are validated separately. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  blockquote: new Set(["cite"]),
};

/** Elements that imply the rest of the document may be dropped. */
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
/** A tag, its name, and any attribute section. */
const TAG = /<(\/)?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
/** The attribute section, once separated from the tag name. */
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
/** A URL we are willing to put in href/src. */
const SAFE_SCHEME = /^(https?:|mailto:|\/|#)/i;

function escapeText(value: string): string {
  return value
    .replace(/&(?![a-zA-Z][a-zA-Z0-9]{1,9};|#\d{1,7};|#[xX][0-9a-fA-F]{1,6};)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&(?![a-zA-Z][a-zA-Z0-9]{1,9};|#\d{1,7};|#[xX][0-9a-fA-F]{1,6};)/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Drops javascript:, data: and anything else that is not a plain navigable URL. */
function safeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // A scheme-relative or relative URL is fine; an explicit scheme must be safe.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed.startsWith("/") || trimmed.startsWith("#") ? trimmed : null;
  }
  return SAFE_SCHEME.test(trimmed) ? trimmed : null;
}

function filterAttributes(tag: string, source: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed) return "";

  const parts: string[] = [];
  ATTR.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ATTR.exec(source)) !== null) {
    const name = match[1].toLowerCase();
    if (!allowed.has(name)) continue;

    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (name === "href" || name === "src" || name === "cite") {
      const url = safeUrl(value);
      if (!url) continue;
      parts.push(`${name}="${escapeAttribute(url)}"`);
      continue;
    }
    if (name === "width" || name === "height") {
      if (!/^\d{1,4}$/.test(value)) continue;
      parts.push(`${name}="${value}"`);
      continue;
    }
    parts.push(`${name}="${escapeAttribute(value)}"`);
  }

  // An author-supplied link must not hand the opener to the destination.
  if (tag === "a" && parts.some((part) => part.startsWith("href="))) {
    parts.push('target="_blank"', 'rel="noopener noreferrer"');
  }

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

/**
 * Rebuilds an admin-typed HTML body from the allow-list above.
 *
 * Unbalanced markup is closed as it is met, so a half-typed `<ul>` cannot break
 * the layout of the page around it.
 */
export function sanitizeArticleHtml(input: string | null | undefined): string {
  if (!input) return "";

  let html = input;

  // Remove comments first: they can hide markup from a naive tag scan.
  html = html.replace(HTML_COMMENT, "");

  // Remove dangerous elements together with everything inside them.
  for (const tag of DROP_WITH_CONTENT) {
    const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi");
    const lone = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
    html = html.replace(paired, "").replace(lone, "");
  }

  const open: string[] = [];
  let out = "";
  let cursor = 0;
  TAG.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG.exec(html)) !== null) {
    out += escapeText(html.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const isClosing = match[1] === "/";
    const tag = match[2].toLowerCase();
    const attrSource = match[3] ?? "";

    if (!ALLOWED_TAGS.has(tag)) continue; // drop the tag, keep the text
    if (VOID_TAGS.has(tag)) {
      out += isClosing ? "" : `<${tag}${filterAttributes(tag, attrSource)}>`;
      continue;
    }

    if (isClosing) {
      const index = open.lastIndexOf(tag);
      // Ignore a close with no matching open, and close anything left dangling
      // inside it so the surrounding page keeps its structure.
      if (index === -1) continue;
      for (let i = open.length - 1; i >= index; i--) out += `</${open[i]}>`;
      open.length = index;
      continue;
    }

    out += `<${tag}${filterAttributes(tag, attrSource)}>`;
    open.push(tag);
  }

  out += escapeText(html.slice(cursor));
  for (let i = open.length - 1; i >= 0; i--) out += `</${open[i]}>`;

  return out.trim();
}

export type TimelineEntry = { date: string; label: string; body: string };

/**
 * The timeline is stored as a JSON string on the row. A bad or hand-edited
 * value must not take the article page down, so anything unexpected yields an
 * empty list rather than throwing.
 */
export function parseEventTimeline(value: string | null | undefined): TimelineEntry[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const record = entry as Record<string, unknown>;
      const date = typeof record.date === "string" ? record.date : "";
      const label = typeof record.label === "string" ? record.label : "";
      const body = typeof record.body === "string" ? record.body : "";
      // An entry with nothing to show is not worth a timeline dot.
      return date || label || body ? [{ date, label, body }] : [];
    });
  } catch {
    return [];
  }
}
