// ---------------------------------------------------------------------------
// Fan Hub Plus — admin actions  (Phase 11)
// Moderation of fan submissions and management of the chatbot knowledge base.
// Every action independently re-checks the session's role — the UI is just
// sugar, this guard is the actual lock.
// ---------------------------------------------------------------------------

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  articleSchema,
  categorySchema,
  characterSchema,
  contentSchema,
  eventSchema,
  merchSchema,
  blankToNull,
  combineEventDate,
  feedbackStatusSchema,
  parseDateOrNull,
  parseNumberOrNull,
  timelineToJson,
  FEEDBACK_STATUS_LABEL,
  USER_ROLES,
} from "@/lib/validations/admin";

export type AdminResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return "Please sign in.";
  if (session.user.role !== "ADMIN") return "Admins only.";
  return null;
}

/** Turns a Zod failure into the error shape the manager forms expect. */
function invalid(error: z.ZodError, fallback: string): AdminResult {
  return {
    ok: false,
    error: error.issues[0]?.message ?? fallback,
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/**
 * The catalogue rows appear on the home page, the explorer lanes, the fandom
 * shelves and the detail pages, so a write here invalidates all of them.
 * `revalidatePath()` takes a route path, not a URL with a query string, so
 * "/explore?type=VIDEO" would silently do nothing — hence the plain paths.
 */
function revalidateCatalogue(detail?: { contentId?: string; merchId?: string }) {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/merch");
  revalidatePath("/events");
  revalidatePath("/admin");
  if (detail?.contentId) revalidatePath(`/content/${detail.contentId}`);
  if (detail?.merchId) revalidatePath(`/merch/${detail.merchId}`);
}

/** Characters and the fandom shelves they appear on. */
function revalidateCharacters(characterId?: string) {
  revalidatePath("/characters");
  revalidatePath("/explore");
  revalidatePath("/");
  revalidatePath("/admin");
  if (characterId) revalidatePath(`/characters/${characterId}`);
}

// ------------------------------------------------------- submission review
const statusSchema = z.enum(["APPROVED", "REJECTED"]);

export async function reviewSubmission(
  submissionId: string,
  status: string,
): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const submission = await prisma.fanSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) return { ok: false, error: "Submission not found." };

  await prisma.fanSubmission.update({
    where: { id: submissionId },
    data: { status: parsed.data, reviewed_at: new Date() },
  });

  revalidatePath("/admin");
  return {
    ok: true,
    message: parsed.data === "APPROVED" ? "Submission approved." : "Submission rejected.",
  };
}

export async function deleteSubmission(submissionId: string): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const existing = await prisma.fanSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Submission not found." };

  try {
    await prisma.fanSubmission.delete({ where: { id: submissionId } });
  } catch {
    return { ok: false, error: "That submission could not be removed." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Submission deleted." };
}

// ------------------------------------------------------------ FAQ manager
const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(3, "Ask a real question.").max(200),
  answer: z.string().trim().min(3, "Answer is required.").max(1000),
  keywords: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => value ?? ""),
});

export async function saveFaq(input: {
  id?: string;
  question: string;
  answer: string;
  keywords?: string;
}): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = faqSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Invalid entry." };
  }
  const { id, question, answer, keywords } = parsed.data;

  try {
    // Branch on the presence of an id. The old code passed a "__new__"
    // sentinel into upsert(), which fails outright for a brand-new rule
    // because no row carries that id.
    if (id) {
      await prisma.chatbotFAQ.update({
        where: { id },
        data: { question, answer, keywords },
      });
    } else {
      await prisma.chatbotFAQ.create({ data: { question, answer, keywords } });
    }
  } catch {
    return { ok: false, error: "That rule could not be saved." };
  }

  // revalidatePath() takes a route path, not a URL with a query string, so
  // "/admin?tab=faqs" was silently doing nothing. Revalidating "/admin"
  // refreshes the tabbed panel whatever tab is showing.
  revalidatePath("/admin");
  return { ok: true, message: id ? "Knowledge base updated." : "Rule added." };
}

export async function deleteFaq(id: string): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const existing = await prisma.chatbotFAQ.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "That rule no longer exists." };

  try {
    await prisma.chatbotFAQ.delete({ where: { id } });
  } catch {
    // The old code swallowed the error and reported success regardless.
    return { ok: false, error: "That rule could not be removed." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Rule removed." };
}

// ===========================================================================
// Catalogue CRUD
//
// Until now the catalogue was frozen: the seed script created the rows and
// nothing could add, change or remove one afterwards. These actions give an
// ADMIN the missing management surface. Every one of them re-checks the role
// server-side, because a server action is a public HTTP endpoint.
// ===========================================================================

/** Confirms the category actually exists before it is written as a FK. */
async function categoryExists(categoryId: string): Promise<boolean> {
  const found = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  return found !== null;
}

// ------------------------------------------------------------------- content
export async function saveContent(input: unknown): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "Check the highlighted fields.");

  const { id, categoryId: category, title, type, genre, description } = parsed.data;

  if (!(await categoryExists(category))) {
    return { ok: false, error: "Pick a fandom from the list." };
  }

  const data = {
    category_id: category,
    title,
    type,
    genre: blankToNull(genre),
    description,
    release_date: parseDateOrNull(parsed.data.releaseDate),
    media_url: blankToNull(parsed.data.mediaUrl),
    trailer_url: blankToNull(parsed.data.trailerUrl),
    popularity_score: parseNumberOrNull(parsed.data.popularityScore) ?? 0,
  };

  try {
    if (id) {
      const existing = await prisma.content.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) return { ok: false, error: "That title no longer exists." };
      await prisma.content.update({ where: { id }, data });
    } else {
      await prisma.content.create({ data });
    }
  } catch {
    return { ok: false, error: "That title could not be saved. Please try again." };
  }

  revalidateCatalogue({ contentId: id });
  return { ok: true, message: id ? "Title updated." : "Title added to the catalogue." };
}

export async function deleteContent(id: string): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const existing = await prisma.content.findUnique({
    where: { id },
    select: { id: true, title: true, _count: { select: { bookmarks: true, ratings: true } } },
  });
  if (!existing) return { ok: false, error: "That title no longer exists." };

  // Content owns its engagement rows (the schema cascades), so deleting a
  // popular title silently discards real fan data. The UI states the counts
  // before asking for confirmation, and the toast repeats them afterwards
  // rather than pretending nothing was lost.
  const lost = existing._count.bookmarks + existing._count.ratings;
  const detail =
    lost > 0
      ? ` along with ${existing._count.bookmarks} bookmark(s) and ${existing._count.ratings} rating(s)`
      : "";

  try {
    await prisma.content.delete({ where: { id } });
  } catch {
    return { ok: false, error: "That title could not be removed." };
  }

  revalidateCatalogue({ contentId: id });
  return { ok: true, message: `"${existing.title}" removed${detail}.` };
}

// --------------------------------------------------------------- merchandise
export async function saveMerch(input: unknown): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = merchSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "Check the highlighted fields.");

  const { id, categoryId: category, name, tag, isUpcoming } = parsed.data;

  if (!(await categoryExists(category))) {
    return { ok: false, error: "Pick a fandom from the list." };
  }

  const data = {
    category_id: category,
    name,
    image_url: blankToNull(parsed.data.imageUrl),
    tag,
    is_upcoming: isUpcoming,
    // Display-only price. There is no checkout and none is planned.
    price: parseNumberOrNull(parsed.data.price),
  };

  try {
    if (id) {
      const existing = await prisma.merchandiseItem.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) return { ok: false, error: "That item no longer exists." };
      await prisma.merchandiseItem.update({ where: { id }, data });
    } else {
      await prisma.merchandiseItem.create({ data });
    }
  } catch {
    return { ok: false, error: "That item could not be saved. Please try again." };
  }

  revalidateCatalogue({ merchId: id });
  return { ok: true, message: id ? "Item updated." : "Item added to the shelf." };
}

export async function deleteMerch(id: string): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const existing = await prisma.merchandiseItem.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { bookmarks: true } } },
  });
  if (!existing) return { ok: false, error: "That item no longer exists." };

  const detail =
    existing._count.bookmarks > 0
      ? ` along with ${existing._count.bookmarks} bookmark(s)`
      : "";

  try {
    await prisma.merchandiseItem.delete({ where: { id } });
  } catch {
    return { ok: false, error: "That item could not be removed." };
  }

  revalidateCatalogue({ merchId: id });
  return { ok: true, message: `"${existing.name}" removed${detail}.` };
}

// --------------------------------------------------------------------- event
export async function saveEvent(input: unknown): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "Check the highlighted fields.");

  const { id, name, city, latitude, longitude, time } = parsed.data;
  const category = blankToNull(parsed.data.categoryId);

  if (category && !(await categoryExists(category))) {
    return { ok: false, error: "Pick a fandom from the list." };
  }

  // Read the row first: the stored time is what an edit with a blank time field
  // keeps, since formatEventDate() prints the hour on the public events page.
  let existing: { id: string; date: Date } | null = null;
  if (id) {
    existing = await prisma.event.findUnique({
      where: { id },
      select: { id: true, date: true },
    });
    if (!existing) return { ok: false, error: "That event no longer exists." };
  }

  const chosen = combineEventDate(parsed.data.date, time, existing?.date);
  if (!chosen) return { ok: false, error: "Pick a date." };

  const data = {
    name,
    city,
    date: chosen,
    ticket_link: blankToNull(parsed.data.ticketLink),
    latitude: Number(latitude),
    longitude: Number(longitude),
    category_id: category,
  };

  try {
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
    } else {
      await prisma.event.create({ data });
    }
  } catch {
    return { ok: false, error: "That event could not be saved. Please try again." };
  }

  revalidateCatalogue();
  return { ok: true, message: id ? "Event updated." : "Event added to the calendar." };
}

export async function deleteEvent(id: string): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) return { ok: false, error: "That event no longer exists." };

  try {
    await prisma.event.delete({ where: { id } });
  } catch {
    return { ok: false, error: "That event could not be removed." };
  }

  revalidateCatalogue();
  return { ok: true, message: `"${existing.name}" removed from the calendar.` };
}

// ===========================================================================
// Fandom presentation + characters
// ===========================================================================

/**
 * Updates a fandom's presentation fields.
 *
 * There is deliberately no create or delete here. `Category.name` is the
 * CategoryName enum and the unique key of the row, so the eight fandoms are
 * fixed by the schema; and the migration puts every referencing table on
 * ON DELETE RESTRICT, so deleting one would be refused by the database the
 * moment any content, character, article, merch item or event pointed at it.
 * Both operations are schema changes, not admin edits.
 */
export async function saveCategory(input: unknown): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "Check the highlighted fields.");

  const { id, description, featured } = parsed.data;

  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) return { ok: false, error: "That fandom no longer exists." };

  try {
    await prisma.category.update({
      where: { id },
      data: {
        description,
        cover_image: blankToNull(parsed.data.coverImage),
        featured,
      },
    });
  } catch {
    return { ok: false, error: "That fandom could not be saved. Please try again." };
  }

  revalidateCharacters();
  revalidateCatalogue();
  return { ok: true, message: `${existing.name} updated.` };
}

// ------------------------------------------------------------------- character
export async function saveCharacter(input: unknown): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = characterSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "Check the highlighted fields.");

  const { id, categoryId: category, name, bio } = parsed.data;

  if (!(await categoryExists(category))) {
    return { ok: false, error: "Pick a fandom from the list." };
  }

  const data = {
    category_id: category,
    name,
    bio,
    image_url: blankToNull(parsed.data.imageUrl),
  };

  try {
    if (id) {
      const existing = await prisma.characterProfile.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) return { ok: false, error: "That character no longer exists." };
      await prisma.characterProfile.update({ where: { id }, data });
    } else {
      await prisma.characterProfile.create({ data });
    }
  } catch {
    return { ok: false, error: "That character could not be saved. Please try again." };
  }

  revalidateCharacters(id);
  return { ok: true, message: id ? "Character updated." : "Character added." };
}

export async function deleteCharacter(id: string): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const existing = await prisma.characterProfile.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { bookmarks: true } } },
  });
  if (!existing) return { ok: false, error: "That character no longer exists." };

  // Bookmark_character_id_fkey is ON DELETE CASCADE, so the bookmarks go too.
  const detail =
    existing._count.bookmarks > 0
      ? ` along with ${existing._count.bookmarks} bookmark(s)`
      : "";

  try {
    await prisma.characterProfile.delete({ where: { id } });
  } catch {
    return { ok: false, error: "That character could not be removed." };
  }

  revalidateCharacters(id);
  return { ok: true, message: `"${existing.name}" removed${detail}.` };
}

// --------------------------------------------------------------------- article
/** The /articles index, its detail pages and the fandom shelves. */
function revalidateArticles(articleId?: string) {
  revalidatePath("/articles");
  revalidatePath("/");
  revalidatePath("/admin");
  if (articleId) revalidatePath(`/articles/${articleId}`);
}

export async function saveArticle(input: unknown): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = articleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "Check the highlighted fields.");

  const { id, categoryId: category, title, richTextBody } = parsed.data;

  if (!(await categoryExists(category))) {
    return { ok: false, error: "Pick a fandom from the list." };
  }

  const data = {
    category_id: category,
    title,
    // Stored as typed. It is sanitized at render time in lib/safe-html.ts,
    // which is the only place the guarantee is worth anything.
    rich_text_body: richTextBody,
    cover_image: blankToNull(parsed.data.coverImage),
    event_timeline: timelineToJson(parsed.data.timeline),
  };

  try {
    if (id) {
      const existing = await prisma.featuredArticle.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) return { ok: false, error: "That article no longer exists." };
      await prisma.featuredArticle.update({ where: { id }, data });
    } else {
      await prisma.featuredArticle.create({ data });
    }
  } catch {
    return { ok: false, error: "That article could not be saved. Please try again." };
  }

  revalidateArticles(id);
  return { ok: true, message: id ? "Article updated." : "Article published." };
}

export async function deleteArticle(id: string): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const existing = await prisma.featuredArticle.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) return { ok: false, error: "That article no longer exists." };

  try {
    await prisma.featuredArticle.delete({ where: { id } });
  } catch {
    return { ok: false, error: "That article could not be removed." };
  }

  revalidateArticles(id);
  return { ok: true, message: `"${existing.title}" removed.` };
}

// --------------------------------------------------------------------- users
// Role changes and suspension. Both guards that matter live here rather than in
// the UI, because either mistake locks everyone out of the console: an admin
// cannot demote or suspend themselves, and the last remaining admin cannot be
// removed from the role.
const userRoleSchema = z.object({
  userId: z.string().trim().min(1).max(60),
  role: z.enum(USER_ROLES),
});

const suspensionSchema = z.object({
  userId: z.string().trim().min(1).max(60),
  /** Days to suspend for; 0 (or absent) lifts the suspension instead. */
  days: z.number().int().min(0).max(3650).optional(),
  reason: z.string().trim().max(300).optional(),
});

function pluralDays(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Refuses a change that would take an admin out of the console, and says why.
 * Returns null when the change is safe. `targetIsAdmin` is passed in because
 * the caller has already loaded the row.
 */
async function blockAdminLockout(
  targetId: string,
  targetIsAdmin: boolean,
  actorId: string,
  change: "demote" | "suspend"
): Promise<string | null> {
  if (targetId === actorId) {
    return change === "demote"
      ? "You cannot change your own role — ask another admin."
      : "You cannot suspend your own account — ask another admin.";
  }

  if (!targetIsAdmin) return null;

  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  return admins <= 1 ? "This is the last admin account, so it has to keep its role." : null;
}

/** An admin guard that also refuses a suspended actor's own session. */
async function requireActiveAdmin(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;
  if (session.user.suspendedUntil) return null;
  return session;
}

export async function setUserRole(input: unknown): Promise<AdminResult> {
  const session = await requireActiveAdmin();
  if (!session) return { ok: false, error: "Admins only." };

  const parsed = userRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That role is not one the app uses." };

  const { userId, role } = parsed.data;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });
  if (!target) return { ok: false, error: "That account no longer exists." };
  if (target.role === role) return { ok: true, message: "No change to make." };

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const blocked = await blockAdminLockout(userId, true, session.user.id, "demote");
    if (blocked) return { ok: false, error: blocked };
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { role } });
  } catch {
    return { ok: false, error: "That role could not be changed. Please try again." };
  }

  revalidatePath("/admin");
  return {
    ok: true,
    message: `${target.name} is now ${role === "ADMIN" ? "an admin" : role.toLowerCase()}.`,
  };
}

export async function setUserSuspension(input: unknown): Promise<AdminResult> {
  const session = await requireActiveAdmin();
  if (!session) return { ok: false, error: "Admins only." };

  const parsed = suspensionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Pick a suspension length between 1 and 3650 days." };
  }

  const { userId, days = 0, reason } = parsed.data;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });
  if (!target) return { ok: false, error: "That account no longer exists." };

  // Lifting a suspension is always allowed, including for the very last admin:
  // a ban is not a demotion, and freeing an account must never be the thing that
  // is blocked.
  if (days === 0) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { suspended_until: null, suspension_reason: null },
      });
    } catch {
      return { ok: false, error: "That suspension could not be lifted. Please try again." };
    }

    revalidatePath("/admin");
    return { ok: true, message: `${target.name}'s suspension lifted.` };
  }

  const blocked = await blockAdminLockout(userId, target.role === "ADMIN", session.user.id, "suspend");
  if (blocked) return { ok: false, error: blocked };

  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { suspended_until: until, suspension_reason: reason || null },
    });
  } catch {
    return { ok: false, error: "That suspension could not be saved. Please try again." };
  }

  revalidatePath("/admin");
  return {
    ok: true,
    message: `${target.name} is suspended for ${pluralDays(days)}.`,
  };
}

// ------------------------------------------------------------------ feedback
// Admin moderation of the messages members send from the dashboard.
export async function setFeedbackStatus(input: unknown): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = feedbackStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That status is not one the queue uses." };
  }

  const { feedbackId, status } = parsed.data;
  const existing = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "That message no longer exists." };

  try {
    await prisma.feedback.update({ where: { id: feedbackId }, data: { status } });
  } catch {
    return { ok: false, error: "That status could not be saved. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: `Message ${FEEDBACK_STATUS_LABEL[status]}.` };
}

export async function deleteFeedback(id: string): Promise<AdminResult> {
  const guard = await requireAdmin();
  if (guard) return { ok: false, error: guard };

  const parsed = z.string().trim().min(1).max(60).safeParse(id);
  if (!parsed.success) return { ok: false, error: "That message no longer exists." };

  const existing = await prisma.feedback.findUnique({
    where: { id: parsed.data },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "That message no longer exists." };

  try {
    await prisma.feedback.delete({ where: { id: existing.id } });
  } catch {
    return { ok: false, error: "That message could not be removed." };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Message deleted." };
}


