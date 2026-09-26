// ---------------------------------------------------------------------------
// Fan Hub Plus — chat bubble UI (client)  (Phase 7)
// A scrolling thread of messages fed by the rule-engine action. Suggests a
// few starter questions and rooms the thread for future Q&A. Accessible
// landmarks: role="log" + aria-live for the conversation.
// ---------------------------------------------------------------------------

"use client";

import { useRef, useState, useTransition } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askChatbot, type BotReply } from "@/lib/chatbot-actions";

export type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  matchedQuestion?: string | null;
};

const SUGGESTIONS = [
  "How do I create an account?",
  "How does bookmarking work?",
  "What can a registered user do?",
  "Where are events listed?",
];

type ChatBotProps = {
  initialMessages: ChatMessage[];
};

export function ChatBot({ initialMessages }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }

  function ask(question: string) {
    if (isPending) return;
    const next =
      question.trim() === ""
        ? draft.trim()
        : question.trim();
    if (!next) return;

    if (question.trim() === "") setDraft("");

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: next },
    ]);
    scrollToBottom();

    startTransition(async () => {
      const result: BotReply = await askChatbot(next);
      if (result.ok) {
        setMessages((current) => [
          ...current,
          {
            id: `bot-${Date.now()}`,
            role: "bot",
            text: result.reply,
            matchedQuestion: result.matchedQuestion,
          },
        ]);
      } else {
        toast.error(result.error);
      }
      scrollToBottom();
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask("");
    }
  }

  return (
    <div className="space-y-4">
      {/* Thread */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Chat with the hub"
        className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto rounded-2xl border bg-background p-4"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ask the hub anything about Fan Hub Plus — it answers from the
            FAQ rule book, so you can always see what it matched.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "flex items-end justify-end gap-2"
                  : "flex items-end justify-start gap-2"
              }
            >
              {message.role === "bot" ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Bot className="size-4" aria-hidden="true" />
                </span>
              ) : null}
              <div
                className={
                  message.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
                    : "max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm"
                }
              >
                {message.matchedQuestion ? (
                  <p className="mb-1 flex items-center gap-1 text-xs italic text-muted-foreground">
                    <Sparkles className="size-3" aria-hidden="true" />
                    matched: “{message.matchedQuestion}”
                  </p>
                ) : null}
                <p className="whitespace-pre-line">{message.text}</p>
              </div>
              {message.role === "user" ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <User className="size-4" aria-hidden="true" />
                </span>
              ) : null}
            </div>
          ))
        )}
        {isPending ? (
          <div className="flex items-end gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="size-4" aria-hidden="true" />
            </span>
            <div className="animate-pulse rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm text-muted-foreground">
              Looking that up…
            </div>
          </div>
        ) : null}
      </div>

      {/* Starter suggestions */}
      <div className="flex flex-wrap gap-1.5" aria-label="Suggested questions">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => ask(suggestion)}
            disabled={isPending}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      {/* Composer */}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          ask("");
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={300}
          placeholder="Ask about accounts, bookmarks, ratings, events…"
          aria-label="Your question"
          className="min-h-[3.5rem] flex-1 resize-none"
        />
        <Button type="submit" size="icon-lg" disabled={isPending} aria-label="Send question">
          <Send aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}