"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChefHat,
  Flame,
  Leaf,
  MessageSquareHeart,
  Sparkles,
  Star,
} from "lucide-react";
import { formatPrice, type MenuItem, type Review } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useMenu } from "@/lib/useMenu";
import { useSettings } from "@/lib/useSettings";
import { Button } from "./_components/ui/Button";
import { Card } from "./_components/ui/Card";
import { Badge } from "./_components/ui/Badge";
import { SiteNav } from "./_components/SiteNav";
import { Brand } from "./_components/Brand";

const STEPS = [
  {
    icon: MessageSquareHeart,
    title: "Chat your order",
    desc: "Tell our AI assistant what you're craving — in plain language.",
  },
  {
    icon: CheckCircle2,
    title: "Confirm in a tap",
    desc: "Review the itemized order and choose dine-in, pickup, or delivery.",
  },
  {
    icon: Bike,
    title: "Track in real time",
    desc: "Watch it move from the kitchen to your door on a live map.",
  },
];

function tagBadge(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes("veg"))
    return (
      <Badge key={tag} tone="success">
        <Leaf className="h-3 w-3" /> {tag}
      </Badge>
    );
  if (t.includes("spicy"))
    return (
      <Badge key={tag} tone="danger">
        <Flame className="h-3 w-3" /> {tag}
      </Badge>
    );
  return <Badge key={tag}>{tag}</Badge>;
}

export default function Home() {
  const settings = useSettings();
  const { items, loaded } = useMenu();
  const featured = items.filter((i) => i.available).slice(0, 6);

  const [reviews, setReviews] = useState<Review[]>([]);
  const loadReviews = useCallback(() => {
    apiFetch<Review[]>("/api/v1/reviews")
      .then((r) => setReviews(r.slice(0, 3)))
      .catch(() => setReviews([]));
  }, []);
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-hero-glow">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2">
            <div>
              <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered ordering
              </span>
              <h1
                className="animate-fade-up mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
                style={{ ["--delay" as string]: "0.05s" }}
              >
                {settings?.tagline ? (
                  settings.tagline
                ) : (
                  <>
                    Order dinner by <span className="text-gradient">chatting.</span>
                  </>
                )}
              </h1>
              <p
                className="animate-fade-up mt-4 max-w-md text-lg text-muted-foreground"
                style={{ ["--delay" as string]: "0.1s" }}
              >
                Talk to our assistant, book a table, or track delivery in real
                time — the whole restaurant, in one conversation.
              </p>
              <div
                className="animate-fade-up mt-8 flex flex-wrap gap-3"
                style={{ ["--delay" as string]: "0.15s" }}
              >
                <Link href="/customer">
                  <Button size="md" className="shadow-[var(--shadow-lift)]">
                    <MessageSquareHeart className="h-4 w-4" />
                    Start an order
                  </Button>
                </Link>
                <Link href="/reservations">
                  <Button variant="outline" size="md">
                    Reserve a table
                  </Button>
                </Link>
                <Link href="/menu">
                  <Button variant="ghost" size="md">
                    Browse menu
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Product chat-preview mock */}
            <ChatPreview />
          </div>
        </section>

        {/* ── Trust strip ──────────────────────────────────────────────── */}
        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-6 px-6 py-6 sm:grid-cols-4">
            <Stat value={`${items.length || "20"}+`} label="Dishes" />
            <Stat value="AI" label="Conversational ordering" />
            <Stat value="Live" label="Delivery tracking" />
            <Stat value="Free" label="Table reservations" />
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="text-center font-display text-3xl font-semibold tracking-tight">
            How it works
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Card key={s.title} className="p-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <s.icon className="h-6 w-6" />
                </span>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {i + 1}
                </div>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Featured menu ────────────────────────────────────────────── */}
        {loaded && featured.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-6 pb-16">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                Popular right now
              </h2>
              <Link
                href="/menu"
                className="text-sm font-medium text-primary hover:underline"
              >
                Full menu →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((item) => (
                <Link key={item.id} href={`/menu/${item.id}`} className="group">
                  <Card className="hover-lift flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold group-hover:text-primary">
                        {item.name}
                      </h3>
                      <span className="shrink-0 font-semibold tabular-nums text-primary">
                        {formatPrice(item.priceCents)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {item.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((t) => tagBadge(t))}
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Testimonials ─────────────────────────────────────────────── */}
        {reviews.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-6 pb-16">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight">
              Loved by our guests
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {reviews.map((r) => (
                <Card key={r.id} className="flex flex-col p-6">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4"
                        fill={i < r.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  {r.comment && (
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
                      “{r.comment}”
                    </p>
                  )}
                  <div className="mt-4 text-sm font-semibold">{r.name}</div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── CTA band ─────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-16">
          <div className="bg-gradient-brand relative overflow-hidden rounded-3xl px-8 py-12 text-center text-white shadow-[var(--shadow-lift)]">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Hungry? Let&apos;s get you fed.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-white/90">
              Start a conversation and your order is ready in under a minute.
            </p>
            <Link href="/customer" className="mt-6 inline-block">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-transform hover:-translate-y-0.5">
                <MessageSquareHeart className="h-4 w-4" />
                Order now
              </span>
            </Link>
          </div>
        </section>

        {/* ── For our team ─────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium">For our team:</span>
            <Link
              href="/kitchen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-medium transition-colors hover:text-foreground"
            >
              <ChefHat className="h-4 w-4" /> Kitchen
            </Link>
            <Link
              href="/owner"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-medium transition-colors hover:text-foreground"
            >
              <Sparkles className="h-4 w-4" /> Owner console
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-3xl font-semibold text-primary">
        {value}
      </div>
      <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

// A static preview of the AI ordering conversation — sells the core feature.
function ChatPreview() {
  return (
    <div
      className="animate-fade-up relative mx-auto w-full max-w-sm"
      style={{ ["--delay" as string]: "0.2s" }}
    >
      <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-white">
            <MessageSquareHeart className="h-4 w-4" />
          </span>
          <div className="text-sm font-semibold">Order Assistant</div>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> online
          </span>
        </div>

        <div className="space-y-3 py-4">
          <Bubble side="left">Hi! What can I get you today?</Bubble>
          <Bubble side="right">Two butter chickens and a garlic naan 🍛</Bubble>
          <div className="rounded-2xl rounded-tl-sm border border-border bg-muted/50 p-3 text-sm">
            <div className="mb-2 font-semibold">Here&apos;s your order</div>
            <div className="flex justify-between">
              <span>
                <span className="text-primary">2×</span> Butter Chicken
              </span>
              <span className="tabular-nums text-muted-foreground">$29.00</span>
            </div>
            <div className="flex justify-between">
              <span>
                <span className="text-primary">1×</span> Garlic Naan
              </span>
              <span className="tabular-nums text-muted-foreground">$3.50</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">$32.50</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-brand py-2 text-xs font-semibold text-white">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm &amp; place order
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  side,
  children,
}: {
  side: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div className={side === "right" ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          side === "right"
            ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
            : "max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-muted/50 px-3 py-2 text-sm"
        }
      >
        {children}
      </div>
    </div>
  );
}

function SiteFooter() {
  const settings = useSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <Brand />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            {settings?.tagline ?? "Modern kitchen — order, dine, deliver."}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Explore
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              { href: "/menu", label: "Menu" },
              { href: "/reservations", label: "Reservations" },
              { href: "/reviews", label: "Reviews" },
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Visit us
          </div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {settings?.address && <li>{settings.address}</li>}
            {settings?.phone && <li>{settings.phone}</li>}
            {settings?.hours && <li>{settings.hours}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto w-full max-w-5xl px-6 py-4 text-xs text-muted-foreground">
          © {year} {settings?.name ?? "Tavola"}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
