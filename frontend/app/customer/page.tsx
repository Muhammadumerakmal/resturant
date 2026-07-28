"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@repo/shared";
import type { ProposedOrder, OrderWithItems } from "@repo/shared";
import { api } from "@/lib/api";

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
  }, [messages, proposed]);

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
    <main className="mx-auto flex h-screen max-w-2xl flex-col px-4 py-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Order Assistant</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Home
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                  : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {sending && (
          <div className="text-left text-sm text-neutral-400">…</div>
        )}

        {placed && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm dark:border-green-800 dark:bg-green-950">
            <div className="font-semibold text-green-800 dark:text-green-300">
              Order placed ✅ #{placed.id.slice(0, 8)} — {placed.status}
            </div>
          </div>
        )}

        {proposed && !placed && (
          <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-2 text-sm font-semibold">Review your order</div>
            <ul className="space-y-1 text-sm">
              {proposed.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {it.quantity} × {it.name}
                    {it.notes ? (
                      <span className="text-neutral-500"> — {it.notes}</span>
                    ) : null}
                  </span>
                  <span className="text-neutral-500">
                    {formatPrice(it.unit_price_cents * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-sm font-semibold dark:border-neutral-700">
              <span>Total</span>
              <span>{formatPrice(proposed.total_cents)}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={confirmOrder}
                disabled={sending}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                Confirm &amp; place order
              </button>
              <button
                onClick={() => setProposed(null)}
                disabled={sending}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                Keep editing
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. What's vegetarian? or: two butter chickens and a naan"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </main>
  );
}
