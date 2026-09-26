// ---------------------------------------------------------------------------
// Fan Hub Plus — chat with the hub  (/chatbot)  (Phase 7)
// Rule-engine FAQ bot seeded in prisma/seed.ts. History from your past
// sessions is loaded for signed-in members; guests get a fresh thread.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { Bot, BookOpenText } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { ChatBot, type ChatMessage } from "@/components/chatbot/chat-bot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Ask the hub",
  description: "The Fan Hub Plus FAQ bot — answers from the rule book.",
};

export default async function ChatbotPage() {
  const session = await auth();

  const history = session?.user?.id
    ? await prisma.chatbotQuery.findMany({
        where: { user_id: session.user.id },
        orderBy: { created_at: "asc" },
        take: 50,
        select: { id: true, message: true, response: true },
      })
    : [];

  const initialMessages: ChatMessage[] = history
    .map((entry) => [
      { id: `${entry.id}-q`, role: "user" as const, text: entry.message },
      { id: `${entry.id}-a`, role: "bot" as const, text: entry.response },
    ])
    .flat();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-5">
      <div className="space-y-8 lg:col-span-3">
        <Breadcrumbs crumbs={[{ label: "Ask the hub" }]} />
        <header className="space-y-1">
          <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
            Chat with the hub
          </h1>
          <p className="text-muted-foreground">
            Instant answers about accounts, bookmarks, ratings and events.
          </p>
        </header>

        <ChatBot initialMessages={initialMessages} />
      </div>

      <aside className="space-y-4 lg:col-span-2 lg:pt-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5 text-primary" aria-hidden="true" />
              How the bot works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              The hub answers from a curated FAQ rule book, not a model. Your
              question is matched against keyword lists and the best answer
              comes back — with a note showing which stored question it matched
              so it stays explainable.
            </p>
            <p>
              Every question is saved to your history (when signed in) so the
              dashboard can show what you&apos;ve asked.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenText className="size-5 text-primary" aria-hidden="true" />
              Good things to ask
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside space-y-1.5 text-sm text-muted-foreground">
              <li>How do I reset my password?</li>
              <li>How does fan content get approved?</li>
              <li>Who runs Fan Hub Plus?</li>
              <li>How do I rate content?</li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}