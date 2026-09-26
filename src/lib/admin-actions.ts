// ---------------------------------------------------------------------------
// Fan Hub Plus — admin actions  (Phase 11)
// Moderation of fan submissions and management of the chatbot knowledge base.
// Every action independently re-checks the session's role — the UI is just
// sugar, this guard is the actual lock.
// ---------------------------------------------------------------------------

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AdminResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return "Please sign in.";
  if (session.user.role !== "ADMIN") return "Admins only.";
  return null;
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
