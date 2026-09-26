// ---------------------------------------------------------------------------
// Fan Hub Plus — engagement validation
// Shared by the member-facing engagement forms and their server actions.
// Anything a client form validates belongs here rather than in a "use server"
// module: a server-action file may only export async functions, so a client
// component cannot import a schema from one without breaking the build.
// ---------------------------------------------------------------------------

import { z } from "zod";

export const BOOKMARK_TARGETS = ["content", "character", "merchandise"] as const;

export type BookmarkTarget = (typeof BOOKMARK_TARGETS)[number];

/**
 * The chatbot FAQ promises members can send feedback, so the dashboard has a
 * form for it. A member may edit or withdraw their own message while it is
 * still unresolved; the server re-checks ownership either way.
 */
export const feedbackSchema = z.object({
  feedbackId: z.string().trim().max(60).optional(),
  type: z.enum(["BUG", "SUGGESTION", "QUERY"]),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more so we can act on it.")
    .max(2000, "That message is too long — 2000 characters is the ceiling."),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

/** How many unresolved messages one member may have open at once. */
export const MAX_OPEN_FEEDBACK_PER_MEMBER = 5;

/** A per-member send budget, in messages per hour. */
export const FEEDBACK_PER_HOUR = 10;
export const FEEDBACK_WINDOW_MS = 60 * 60 * 1000;
