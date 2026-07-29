"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useOwner } from "../OwnerShell";
import { ChatBubble, type ChatMessage } from "@/app/_components/chat/ChatBubble";
import { TypingBubble } from "@/app/_components/chat/TypingBubble";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Button } from "@/app/_components/ui/Button";
import { Input } from "@/app/_components/ui/Input";

const SUGGESTIONS = [
  "How were sales the last 7 days?",
  "What are my best-selling items this month?",
  "Any items out of stock or running low?",
  "Show the revenue trend day by day.",
  "How many cancelled reservations did I lose?",
];

const GREETING =
  "Hi! I'm your analytics assistant. Ask me about sales, top items, daily trends, the order pipeline, inventory risks, or reservations. If you don't give a date range I'll assume the last 30 days.";

export default function OwnerAssistantPage() {
  const { staffKey } = useOwner();
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setSending(true);
    try {
      const data = await apiFetch<{ reply?: string }>(
        "/api/v1/agent/owner-chat",
        {
          method: "POST",
          body: { session_id: sessionId, message: trimmed },
          staffKey,
        },
      );
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "" },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  const showSuggestions = messages.length === 1 && !sending;

  return (
    <main className="mt-6 flex flex-1 flex-col">
      <PageHeader
        title="Analytics Assistant"
        subtitle="Ask about sales, reports, best-sellers, losses and more"
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div
        ref={scrollRef}
        className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-4"
      >
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {sending && <TypingBubble />}

        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. What was my revenue last week?"
        />
        <Button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Send message"
          className="shrink-0 px-3"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </main>
  );
}
