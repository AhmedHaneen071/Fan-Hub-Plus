// ---------------------------------------------------------------------------
// Fan Hub Plus — explainable chatbot (Phase 7)
// A rule engine, not a model: the question is scored against the FAQ keyword
// list and the best-matching answer is returned. Every query is persisted so
// the dashboard/history can show what you asked. The "explainable" promise is
// kept by reporting which stored question the answer came from.
// ---------------------------------------------------------------------------

"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const questionSchema = z
  .string()
  .trim()
  .min(1, "Ask something first.")
  .max(300, "Keep it under 300 characters.");

export type BotReply =
  | { ok: true; reply: string; matchedQuestion: string | null }
  | { ok: false; error: string };

// Throttling. The action is reachable without signing in, and every question
// costs a database write, so an unattended script could otherwise flood the
// chatbot history table.
const CHATBOT_LIMIT = { max: 20, windowMs: 10 * 60 * 1000 };
const CHATBOT_ANON_LIMIT = { max: 10, windowMs: 10 * 60 * 1000 };

const FALLBACK =
  "I don't have a ready answer for that yet. A good place to look is the " +
  "Explore page, the Fandom area, or ask in the Events section. If you think " +
  "this is something the hub should know, try 'who runs Fan Hub Plus'.";

export async function askChatbot(
  question: string,
): Promise<BotReply> {
  const parsed = questionSchema.safeParse(question);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Invalid question." };
  }

  const session = await auth();

  // Signed-in members get a per-account budget; everyone else shares a smaller
  // per-IP budget, since there is no account to key on.
  const identity = session?.user?.id ?? (await getClientIp());
  const limit = session?.user?.id ? CHATBOT_LIMIT : CHATBOT_ANON_LIMIT;
  const key = session?.user?.id
    ? `chatbot:user:${identity}`
    : `chatbot:ip:${identity}`;

  const throttle = rateLimit(key, limit.max, limit.windowMs);
  if (!throttle.ok) {
    return {
      ok: false,
      error: `You're asking faster than I can answer. Try again in ${Math.ceil(
        throttle.retryAfterSeconds / 60
      )} minute(s).`,
    };
  }

  const faqs = await prisma.chatbotFAQ.findMany({
    select: { question: true, answer: true, keywords: true },
  });

  const query = parsed.data.toLowerCase();
  let best: { question: string; answer: string; score: number } | null = null;

  for (const faq of faqs) {
    const keywords = faq.keywords
      .split(",")
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean);
    let score = 0;
    for (const keyword of keywords) {
      if (query.includes(keyword)) score += 1;
    }
    if (score > 0 && (best === null || score > best.score)) {
      best = { question: faq.question, answer: faq.answer, score };
    }
  }

  const reply = best ? best.answer : FALLBACK;
  const matchedQuestion = best ? best.question : null;

  await prisma.chatbotQuery.create({
    data: {
      user_id: session?.user?.id ?? null,
      message: parsed.data,
      response: reply,
    },
  });

  return { ok: true, reply, matchedQuestion };
}