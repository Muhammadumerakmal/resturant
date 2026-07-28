"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Send, User, UtensilsCrossed } from "lucide-react";
import { formatPrice } from "@repo/shared";
import type { ProposedOrder, OrderWithItems } from "@repo/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { Input } from "../_components/ui/Input";
import { HomeLink } from "../_components/ui/PageHeader";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function CustomerPage() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your ordering assistant. Ask me about the menu, or tell me what you'd like to order.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [proposed, setProposed] = useState<ProposedOrder | null>(null);
  const [placed, setPlaced] = useState<OrderWithItems | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, proposed, placed, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await fetch(api("/api/v1/agent/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Assistant error");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "" },
      ]);
      if (data.proposed_order) setProposed(data.proposed_order as ProposedOrder);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  async function confirmOrder() {
    if (!proposed) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(api("/api/v1/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "agent",
          session_id: sessionId,
          items: proposed.items.map((it) => ({
            menu_item_id: it.menu_item_id,
            quantity: it.quantity,
            ...(it.notes ? { notes: it.notes } : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not place order");
      setPlaced(data as OrderWithItems);
      setProposed(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex h-screen w-full max-w-2xl flex-col px-4 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Order Assistant</h1>
            <p className="text-xs text-muted-foreground">
              Ask about the menu or order in plain language
            </p>
          </div>
        </div>
        <HomeLink />
      </div>

      <div
        ref={scrollRef}
        className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-4"
      >
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}

        {sending && !placed && <TypingBubble />}

        {placed && (
          <div className="animate-rise-in flex items-start gap-3">
            <Avatar role="assistant" />
            <Card className="border-success-border bg-success-bg p-4">
              <div className="flex items-center gap-2 font-semibold text-success">
                <CheckCircle2 className="h-5 w-5" />
                Order placed!
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-mono">#{placed.id.slice(0, 8)}</span> —{" "}
                <span className="capitalize">{placed.status}</span>. We&apos;ll
                get cooking right away.
              </p>
            </Card>
          </div>
        )}

        {proposed && !placed && (
          <div className="animate-rise-in flex items-start gap-3">
            <Avatar role="assistant" />
            <Card className="w-full p-4">
              <div className="mb-3 text-sm font-semibold">Review your order</div>
              <ul className="space-y-2 text-sm">
                {proposed.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      <span className="font-medium text-primary">
                        {it.quantity}×
                      </span>{" "}
                      {it.name}
                      {it.notes ? (
                        <span className="text-muted-foreground">
                          {" "}
                          — {it.notes}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatPrice(it.unit_price_cents * it.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatPrice(proposed.total_cents)}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={confirmOrder} disabled={sending}>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm &amp; place order
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setProposed(null)}
                  disabled={sending}
                >
                  Keep editing
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. What's vegetarian? or: two butter chickens and a naan"
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

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        role === "assistant"
          ? "bg-primary/10 text-primary"
          : "bg-foreground text-background",
      )}
    >
      {role === "assistant" ? (
        <Bot className="h-4 w-4" />
      ) : (
        <User className="h-4 w-4" />
      )}
    </span>
  );
}

function ChatBubble({ role, content }: ChatMessage) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "animate-rise-in flex items-start gap-3",
        isUser && "flex-row-reverse",
      )}
    >
      <Avatar role={role} />
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border border-border bg-card text-card-foreground",
        )}
      >
        {content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="animate-rise-in flex items-start gap-3">
      <Avatar role="assistant" />
      <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{
              animation: "typing-bounce 1.2s infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
