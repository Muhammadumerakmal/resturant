"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bike,
  CheckCircle2,
  ClipboardList,
  Send,
  UtensilsCrossed,
} from "lucide-react";
import { formatPrice } from "@repo/shared";
import type { ProposedOrder, OrderWithItems, OrderType } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOrderHistory } from "@/lib/useOrderHistory";
import { cn } from "@/lib/cn";
import { Avatar } from "../_components/chat/Avatar";
import { ChatBubble, type ChatMessage } from "../_components/chat/ChatBubble";
import { TypingBubble } from "../_components/chat/TypingBubble";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { Input } from "../_components/ui/Input";
import { HomeLink } from "../_components/ui/PageHeader";

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "dine_in", label: "Dine in" },
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
];

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

  // Fulfillment selection for the current proposed order.
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [delivery, setDelivery] = useState({ name: "", phone: "", address: "" });

  const { add: addToHistory } = useOrderHistory();
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
      const data = await apiFetch<{ reply?: string; proposed_order?: ProposedOrder }>(
        "/api/v1/agent/chat",
        { method: "POST", body: { session_id: sessionId, message: text } },
      );
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "" }]);
      if (data.proposed_order) setProposed(data.proposed_order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  async function confirmOrder() {
    if (!proposed) return;
    if (
      orderType === "delivery" &&
      (!delivery.name.trim() || !delivery.phone.trim() || !delivery.address.trim())
    ) {
      setError("Please fill in your name, phone, and delivery address.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const placedOrder = await apiFetch<OrderWithItems>("/api/v1/orders", {
        method: "POST",
        body: {
          source: "agent",
          session_id: sessionId,
          order_type: orderType,
          ...(orderType === "delivery" && {
            customer_name: delivery.name.trim(),
            customer_phone: delivery.phone.trim(),
            address: delivery.address.trim(),
          }),
          items: proposed.items.map((it) => ({
            menu_item_id: it.menu_item_id,
            quantity: it.quantity,
            ...(it.notes ? { notes: it.notes } : {}),
          })),
        },
      });
      setPlaced(placedOrder);
      addToHistory({
        id: placedOrder.id,
        orderType: placedOrder.orderType,
        placedAt: new Date().toISOString(),
        totalCents: proposed.total_cents,
        itemCount: proposed.items.reduce((s, it) => s + it.quantity, 0),
      });
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
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ClipboardList className="h-4 w-4" />
            Menu
          </Link>
          <HomeLink />
        </div>
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
                <span className="capitalize">{placed.status}</span>.{" "}
                {placed.orderType === "delivery"
                  ? "Track your delivery below."
                  : "We'll get cooking right away."}
              </p>
              {placed.orderType === "delivery" && (
                <Link
                  href={`/track/${placed.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Bike className="h-4 w-4" />
                  Track your order
                </Link>
              )}
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
                        <span className="text-muted-foreground"> — {it.notes}</span>
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

              {/* Fulfillment type */}
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  How would you like it?
                </div>
                <div className="inline-flex w-full items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                  {ORDER_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOrderType(opt.value)}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        orderType === opt.value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {orderType === "delivery" && (
                <div className="mt-3 space-y-2">
                  <Input
                    value={delivery.name}
                    onChange={(e) =>
                      setDelivery({ ...delivery, name: e.target.value })
                    }
                    placeholder="Your name"
                  />
                  <Input
                    value={delivery.phone}
                    onChange={(e) =>
                      setDelivery({ ...delivery, phone: e.target.value })
                    }
                    placeholder="Phone number"
                    inputMode="tel"
                  />
                  <Input
                    value={delivery.address}
                    onChange={(e) =>
                      setDelivery({ ...delivery, address: e.target.value })
                    }
                    placeholder="Delivery address"
                  />
                </div>
              )}

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
