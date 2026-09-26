// ---------------------------------------------------------------------------
// Fan Hub Plus — user engagement server actions
//
// Bookmarks and ratings are the "name of the game" for registered members
// (Phase 3). Every action re-checks the session server-side — the buttons
// are just convenience; the security lives here, never in the client.
// ---------------------------------------------------------------------------

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import {
  FEEDBACK_PER_HOUR,
  FEEDBACK_WINDOW_MS,
  MAX_OPEN_FEEDBACK_PER_MEMBER,
  feedbackSchema,
} from "@/lib/validations/engagement";

const targetSchema = z.object({
  targetType: z.enum(["content", "character", "merchandise"]),
  targetId: z.string().min(1).max(60),
});

const noteSchema = z.object({
  bookmarkId: z.string().min(1).max(60),
  note: z.string().max(500),
});

const bookmarkIdSchema = z.object({
  bookmarkId: z.string().min(1).max(60),
});

const ratingIdSchema = z.object({
  contentId: z.string().min(1).max(60),
});

// The chatbot FAQ tells members they can "send feedback", so this is the path
// that has to exist. A member may edit or delete their own open message (a
// typo fix beats a dead thread) but a RESOLVED one is part of the admin record
// and is locked from the member side. The schema itself lives in
// validations/engagement.ts so the form can share it.
const feedbackIdSchema = z.string().trim().min(1).max(60);

// `value` depends on the chosen scale: 1..5 for stars, +/-1 for thumbs.
const ratingSchema = z
  .object({
    contentId: z.string().min(1).max(60),
    ratingType: z.enum(["STARS", "THUMBS"]),
    value: z.number().int(),
  })
  .refine(
    (data) =>
      data.ratingType === "STARS"
        ? data.value >= 1 && data.value <= 5
        : data.value === 1 || data.value === -1,
    { message: "Rating value does not match the selected scale." }
  );

export type ActionOutcome =
  | { ok: true; message?: string; bookmarked?: boolean }
  | { ok: false; error: string; redirectTo?: string };

const VISITOR_MESSAGE =
  "Your account is in visitor mode, so this is view-only. Register a member account to save and rate.";

// ---------------------------------------------------------------- existence
// The client sends an arbitrary targetType + targetId pair. Without a check the
// database happily stores a bookmark pointing at a row that does not exist (or,
// worse, at a real row belonging to a different target type).
async function targetExists(
  targetType: "content" | "character" | "merchandise",
  targetId: string
): Promise<boolean> {
  switch (targetType) {
    case "content":
      return (
        (await prisma.content.findUnique({
          where: { id: targetId },
          select: { id: true },
        })) !== null
      );
    case "character":
      return (
        (await prisma.characterProfile.findUnique({
          where: { id: targetId },
          select: { id: true },
        })) !== null
      );
    default:
      return (
        (await prisma.merchandiseItem.findUnique({
          where: { id: targetId },
          select: { id: true },
        })) !== null
      );
  }
}

// ----------------------------------------------------------------- bookmarks
export async function toggleBookmark(
  targetType: "content" | "character" | "merchandise",
  targetId: string
): Promise<ActionOutcome> {
  const parsed = targetSchema.safeParse({ targetType, targetId });
  if (!parsed.success) {
    return { ok: false, error: "That item could not be bookmarked." };
  }

  const member = requireMember(await auth(), VISITOR_MESSAGE);
  if (!member.ok) return member;

  const { targetType: type, targetId: id } = parsed.data;
  const userId = member.userId;

  // The Bookmark table keeps ONE nullable column per target type. Exactly one
  // is set per row, so each branch queries a different column.
  try {
    if (!(await targetExists(type, id))) {
      return { ok: false, error: "That item no longer exists." };
    }

    if (type === "content") {
      const existing = await prisma.bookmark.findFirst({
        where: { user_id: userId, content_id: id },
      });
      if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
        revalidatePath("/dashboard");
        return { ok: true, bookmarked: false, message: "Removed from bookmarks." };
      }
      await prisma.bookmark.create({ data: { user_id: userId, content_id: id } });
    } else if (type === "character") {
      const existing = await prisma.bookmark.findFirst({
        where: { user_id: userId, character_id: id },
      });
      if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
        revalidatePath("/dashboard");
        return { ok: true, bookmarked: false, message: "Removed from bookmarks." };
      }
      await prisma.bookmark.create({ data: { user_id: userId, character_id: id } });
    } else {
      const existing = await prisma.bookmark.findFirst({
        where: { user_id: userId, merchandise_id: id },
      });
      if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
        revalidatePath("/dashboard");
        return { ok: true, bookmarked: false, message: "Removed from bookmarks." };
      }
      await prisma.bookmark.create({ data: { user_id: userId, merchandise_id: id } });
    }
  } catch (error) {
    // The unique constraints added in Phase 1 mean a concurrent double-click can
    // lose the race. That is not a failure worth an error toast: the item is
    // bookmarked, which is what the user wanted.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: true, bookmarked: true, message: "Already in your bookmarks." };
    }
    return { ok: false, error: "That item could not be bookmarked. Please try again." };
  }

  revalidatePath("/dashboard");
  return { ok: true, bookmarked: true, message: "Added to your bookmarks!" };
}

export async function updateBookmarkNote(
  bookmarkId: string,
  note: string
): Promise<ActionOutcome> {
  const parsed = noteSchema.safeParse({ bookmarkId, note });
  if (!parsed.success) {
    return { ok: false, error: "That note is too long (500 characters max)." };
  }

  const member = requireMember(await auth(), VISITOR_MESSAGE);
  if (!member.ok) return member;

  // Only the owner may edit a note.
  const owned = await prisma.bookmark.findFirst({
    where: { id: parsed.data.bookmarkId, user_id: member.userId },
  });
  if (!owned) return { ok: false, error: "Bookmark not found." };

  try {
    await prisma.bookmark.update({
      where: { id: owned.id },
      data: { note: parsed.data.note.trim() || null },
    });
  } catch {
    return { ok: false, error: "That note could not be saved." };
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Note saved." };
}

export async function removeBookmark(bookmarkId: string): Promise<ActionOutcome> {
  const parsed = bookmarkIdSchema.safeParse({ bookmarkId });
  if (!parsed.success) return { ok: false, error: "Bookmark not found." };

  const member = requireMember(await auth(), VISITOR_MESSAGE);
  if (!member.ok) return member;

  const owned = await prisma.bookmark.findFirst({
    where: { id: parsed.data.bookmarkId, user_id: member.userId },
  });
  if (!owned) return { ok: false, error: "Bookmark not found." };

  try {
    await prisma.bookmark.delete({ where: { id: owned.id } });
  } catch {
    return { ok: false, error: "That bookmark could not be removed." };
  }

  revalidatePath("/dashboard");
  return { ok: true, bookmarked: false, message: "Removed from bookmarks." };
}

// ------------------------------------------------------------------ ratings
export async function upsertRating(
  contentId: string,
  ratingType: "STARS" | "THUMBS",
  value: number
): Promise<ActionOutcome> {
  const parsed = ratingSchema.safeParse({ contentId, ratingType, value });
  if (!parsed.success) {
    return { ok: false, error: "That rating could not be saved." };
  }

  const member = requireMember(await auth(), VISITOR_MESSAGE);
  if (!member.ok) return member;

  // One rating per (user, content) — set the value/scale, or create the row.
  try {
    const exists = await prisma.content.findUnique({
      where: { id: parsed.data.contentId },
      select: { id: true },
    });
    if (!exists) return { ok: false, error: "That title no longer exists." };

    await prisma.rating.upsert({
      where: {
        user_id_content_id: {
          user_id: member.userId,
          content_id: parsed.data.contentId,
        },
      },
      update: { value: parsed.data.value, ratingType: parsed.data.ratingType },
      create: {
        user_id: member.userId,
        content_id: parsed.data.contentId,
        value: parsed.data.value,
        ratingType: parsed.data.ratingType,
      },
    });
  } catch {
    return { ok: false, error: "That rating could not be saved. Please try again." };
  }

  revalidatePath(`/content/${parsed.data.contentId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Rating saved." };
}

export async function removeRating(contentId: string): Promise<ActionOutcome> {
  const parsed = ratingIdSchema.safeParse({ contentId });
  if (!parsed.success) {
    return { ok: false, error: "That rating could not be removed." };
  }

  const member = requireMember(await auth(), VISITOR_MESSAGE);
  if (!member.ok) return member;

  try {
    await prisma.rating.deleteMany({
      where: { user_id: member.userId, content_id: parsed.data.contentId },
    });
  } catch {
    return { ok: false, error: "That rating could not be removed." };
  }

  revalidatePath(`/content/${parsed.data.contentId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Rating removed." };
}

// ----------------------------------------------------------------- feedback
// The FAQ promises members can send feedback and no such form existed. This is
// that form's write path: create or update the member's own message.
export async function sendFeedback(input: unknown): Promise<ActionOutcome> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Pick a type and write between 10 and 2000 characters." };
  }

  const member = requireMember(await auth(), VISITOR_MESSAGE);
  if (!member.ok) return member;

  // Two independent brakes: a per-hour window, and a cap on unresolved
  // threads. The cap is what stops "send 10,000 suggestions" from burying the
  // queue; the window is what stops the table filling in a single burst.
  const limit = rateLimit(
    `feedback:${member.userId}`,
    FEEDBACK_PER_HOUR,
    FEEDBACK_WINDOW_MS
  );
  if (!limit.ok) {
    const hours = Math.max(1, Math.ceil(limit.retryAfterSeconds / 3600));
    return {
      ok: false,
      error: `You have sent a lot of messages recently. Try again in about ${hours} hour${hours === 1 ? "" : "s"}.`,
    };
  }

  if (parsed.data.feedbackId) {
    const owned = await prisma.feedback.findFirst({
      where: { id: parsed.data.feedbackId, user_id: member.userId },
      select: { id: true, status: true },
    });
    if (!owned) return { ok: false, error: "That message no longer exists." };
    if (owned.status === "RESOLVED") {
      return {
        ok: false,
        error: "That message is already resolved — send a new one if there is more to say.",
      };
    }

    try {
      await prisma.feedback.update({
        where: { id: owned.id },
        data: { type: parsed.data.type, message: parsed.data.message },
      });
    } catch {
      return { ok: false, error: "That message could not be saved. Please try again." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { ok: true, message: "Message updated." };
  }

  const openCount = await prisma.feedback.count({
    where: { user_id: member.userId, status: { not: "RESOLVED" } },
  });
  if (openCount >= MAX_OPEN_FEEDBACK_PER_MEMBER) {
    return {
      ok: false,
      error: `You already have ${openCount} unresolved messages. We will get to them — please wait for a reply before adding more.`,
    };
  }

  try {
    await prisma.feedback.create({
      data: {
        user_id: member.userId,
        type: parsed.data.type,
        message: parsed.data.message,
        status: "OPEN",
      },
    });
  } catch {
    return { ok: false, error: "Your message could not be sent. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return {
    ok: true,
    message: "Thanks — the team has your message and will take a look.",
  };
}

/** A member may withdraw their own unresolved message. */
export async function deleteOwnFeedback(feedbackId: string): Promise<ActionOutcome> {
  const parsed = feedbackIdSchema.safeParse(feedbackId);
  if (!parsed.success) return { ok: false, error: "That message no longer exists." };

  const member = requireMember(await auth(), VISITOR_MESSAGE);
  if (!member.ok) return member;

  const owned = await prisma.feedback.findFirst({
    where: { id: parsed.data, user_id: member.userId },
    select: { id: true, status: true },
  });
  if (!owned) return { ok: false, error: "That message no longer exists." };
  if (owned.status === "RESOLVED") {
    return { ok: false, error: "Resolved messages are kept on record and cannot be removed." };
  }

  try {
    await prisma.feedback.delete({ where: { id: owned.id } });
  } catch {
    return { ok: false, error: "That message could not be removed." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true, message: "Message withdrawn." };
}
