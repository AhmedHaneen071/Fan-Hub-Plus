// ---------------------------------------------------------------------------
// Fan Hub Plus — admin catalogue validation
//
// One schema per entity, used by BOTH the client form (via zodResolver) and the
// server action. Re-declaring them in two places is how a form ends up
// validating something the server never checks.
//
// Note on types: every field stays a `string` in the schema, including dates,
// numbers and optional values. React Hook Form holds whatever the <input>
// produced, so a schema that returned `Date | null` or `number` would put a
// value into the input that the browser cannot render. The server action is
// where strings become Dates and numbers, after re-validating with these same
// schemas.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { CONTENT_TYPES } from "@/lib/constants";
import { parseEventTimeline } from "@/lib/safe-html";
import { extractYouTubeId } from "@/lib/youtube";

export const MERCH_TAGS = ["LIMITED_EDITION", "PRE_ORDER", "COLLECTIBLE"] as const;

export const MERCH_TAG_LABELS: Record<(typeof MERCH_TAGS)[number], string> = {
  LIMITED_EDITION: "Limited edition",
  PRE_ORDER: "Pre-order",
  COLLECTIBLE: "Collectible",
};

const categoryId = z
  .string()
  .min(1, "Pick a fandom.")
  .max(60, "Pick a fandom.");

// Kept as a plain string (no "" -> null transform) because the Radix Select
// writes its value straight back into the form field. blankToNull() does the
// conversion server-side.
const optionalCategoryId = z.string().trim().max(60);

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Empty string means "not set"; anything else must be a full http(s) URL. */
const optionalUrl = z
  .string()
  .trim()
  .max(500, "That URL is too long.")
  .refine((value) => value === "" || isHttpUrl(value), {
    message: "Enter a full URL starting with http:// or https://",
  });

/** A trailer only works in the in-page player if it is a YouTube link. */
const optionalYouTubeUrl = z
  .string()
  .trim()
  .max(500, "That URL is too long.")
  .refine((value) => value === "" || (isHttpUrl(value) && extractYouTubeId(value) !== null), {
    message: "Enter a YouTube link, e.g. https://www.youtube.com/watch?v=...",
  });

/** A <input type="date"> produces YYYY-MM-DD, or "" when cleared. */
const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
    { message: "Use the date picker." }
  );

/** A <input type="time"> produces HH:MM, or "" when cleared. */
const optionalTime = z
  .string()
  .trim()
  .refine((value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
    message: "Use the time picker.",
  });

// ------------------------------------------------------------------- content
export const contentSchema = z.object({
  id: z.string().trim().max(60).optional(),
  categoryId,
  title: z.string().trim().min(2, "Title is required.").max(120, "Keep the title under 120 characters."),
  type: z.enum(CONTENT_TYPES),
  genre: z.string().trim().max(40, "Keep the genre under 40 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Write at least a sentence so the card has something to show.")
    .max(600, "Keep the description under 600 characters."),
  releaseDate: optionalDate,
  mediaUrl: optionalUrl,
  trailerUrl: optionalYouTubeUrl,
  popularityScore: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (/^\d{1,3}$/.test(value) && Number(value) >= 0 && Number(value) <= 100),
      { message: "Enter a whole number from 0 to 100." }
    ),
});

export type ContentInput = z.infer<typeof contentSchema>;

// --------------------------------------------------------------- merchandise
export const merchSchema = z.object({
  id: z.string().trim().max(60).optional(),
  categoryId,
  name: z.string().trim().min(2, "Name is required.").max(120),
  imageUrl: optionalUrl,
  tag: z.enum(MERCH_TAGS),
  isUpcoming: z.boolean(),
  // Display-only. There is no checkout in this project and none is planned.
  price: z
    .string()
    .trim()
    .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
      message: "Enter a price of 0 or more, or leave it blank.",
    }),
});

export type MerchInput = z.infer<typeof merchSchema>;

// --------------------------------------------------------------------- event
export const eventSchema = z.object({
  id: z.string().trim().max(60).optional(),
  name: z.string().trim().min(2, "Name is required.").max(120),
  city: z.string().trim().min(2, "City is required.").max(80),
  date: z
    .string()
    .trim()
    .min(1, "Pick a date.")
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Use the date picker." }),
  // Seeded events carry a real start time and the public events page prints it
  // ("Thu, Nov 12, 2026, 9:00 AM"), so an edit must not quietly drop it. Blank
  // means "leave the stored time alone" on update.
  time: optionalTime,
  ticketLink: optionalUrl,
  // The events map needs coordinates to place a pin, so these are required.
  latitude: z
    .string()
    .trim()
    .min(1, "Latitude is required for the map.")
    .refine((value) => Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 90, {
      message: "Latitude must be between -90 and 90.",
    }),
  longitude: z
    .string()
    .trim()
    .min(1, "Longitude is required for the map.")
    .refine((value) => Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 180, {
      message: "Longitude must be between -180 and 180.",
    }),
  categoryId: optionalCategoryId,
});

export type EventInput = z.infer<typeof eventSchema>;

// ------------------------------------------------------------------- category
// A Category row's identity is its `name`, and that column is the CategoryName
// enum. So an admin cannot invent a new fandom or rename an existing one from
// here — the set of fandoms is a schema change, not a content edit. What IS
// presentation data is description / cover_image / featured, which is what the
// category cards and the home page shelf render, so that is what this edits.
export const categorySchema = z.object({
  id: z.string().trim().min(1, "Missing category."),
  description: z
    .string()
    .trim()
    .min(10, "Write at least a sentence — this is the blurb on the category card.")
    .max(400, "Keep the description under 400 characters."),
  coverImage: optionalUrl,
  featured: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ------------------------------------------------------------------ character
export const characterSchema = z.object({
  id: z.string().trim().max(60).optional(),
  categoryId,
  name: z.string().trim().min(2, "Name is required.").max(80),
  bio: z
    .string()
    .trim()
    .min(10, "Write at least a sentence so the profile has something to show.")
    .max(600, "Keep the bio under 600 characters."),
  imageUrl: optionalUrl,
});

export type CharacterInput = z.infer<typeof characterSchema>;

// -------------------------------------------------------------------- article
// The body is stored as HTML and rendered on a public page, so it is capped
// generously but not unbounded. The stored text is *not* sanitized here: the
// sanitizer in lib/safe-html.ts runs at render time, which is the only place a
// guarantee about the output actually matters.
export const articleSchema = z.object({
  id: z.string().trim().max(60).optional(),
  categoryId,
  title: z.string().trim().min(4, "Title is required.").max(140),
  richTextBody: z
    .string()
    .trim()
    .min(20, "Write at least a paragraph so the article has something to show.")
    .max(20000, "That body is too long — 20000 characters is the ceiling."),
  coverImage: optionalUrl,
  // The timeline is edited as one "Date | Label | Body" row per line and
  // serialized here, because a JSON blob in a textarea is not editable.
  timeline: z
    .string()
    .trim()
    .max(4000)
    .refine(
      (value) =>
        value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .every((line) => line.split("|").length >= 1 && line.split("|").length <= 3),
      { message: "Each timeline line is Date | Label | Body, with at most three parts." }
    ),
});

export type ArticleInput = z.infer<typeof articleSchema>;

/**
 * "2015 | The Breakout | First anime tops the charts." -> the JSON the row
 * stores. Blank lines are skipped, and a line may carry only a date.
 */
export function timelineToJson(value: string): string {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [date = "", label = "", body = ""] = line.split("|").map((part) => part.trim());
      return { date, label, body };
    });
  return JSON.stringify(entries);
}

/** The inverse, for filling the textarea on an edit. */
export function timelineToText(value: string | null | undefined): string {
  return parseEventTimeline(value)
    .map((entry) => [entry.date, entry.label, entry.body].filter(Boolean).join(" | "))
    .join("\n");
}


// ------------------------------------------------------------------ helpers
// Exported so the admin action and the client forms agree on what "cleared"
// means, instead of each side inventing its own empty-string handling.

/** "" -> null, otherwise the trimmed string. */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** "" -> null, otherwise a Date at UTC midnight. */
export function parseDateOrNull(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "" -> null, otherwise a finite number. */
export function parseNumberOrNull(value: string | null | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Builds the stored Date for an event from a date field and an optional time
 * field ("HH:MM", UTC).
 *
 * When `time` is blank and the event already exists, the stored time of day is
 * carried over. Seeded events carry real start times and the public events page
 * prints the hour, so an admin editing only the city would otherwise silently
 * reset a 9:00 AM start to midnight.
 */
export function combineEventDate(
  date: string,
  time: string,
  existing?: Date | null,
): Date | null {
  const base = parseDateOrNull(date);
  if (!base) return null;

  const result = new Date(base);
  if (time) {
    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      result.setUTCHours(hours, minutes, 0, 0);
    }
  } else if (existing) {
    result.setUTCHours(existing.getUTCHours(), existing.getUTCMinutes(), 0, 0);
  }
  return result;
}
