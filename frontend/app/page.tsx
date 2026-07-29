"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ChefHat,
  MessageSquareHeart,
  UtensilsCrossed,
} from "lucide-react";
import { formatPrice } from "@repo/shared";
import { useMenu } from "@/lib/useMenu";
import { useSettings } from "@/lib/useSettings";
import { Button } from "./_components/ui/Button";
import { Card } from "./_components/ui/Card";
import { SiteNav } from "./_components/SiteNav";

const ROLES = [
  {
    href: "/customer",
    title: "Order by chat",
    desc: "Talk to our AI assistant and place an order in seconds.",
    icon: MessageSquareHeart,
  },
  {
    href: "/kitchen",
    title: "Kitchen",
    desc: "Live order queue with one-tap status controls.",
    icon: ChefHat,
  },
  {
    href: "/owner",
    title: "Owner",
    desc: "Live orders, deliveries, customers and sales.",
    icon: BarChart3,
  },
];

export default function Home() {
  const settings = useSettings();
  const { items, loaded } = useMenu();
  const featured = items.filter((i) => i.available).slice(0, 6);

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <div className="flex items-center gap-2 text-primary">
            <UtensilsCrossed className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-widest">
              {settings?.name ?? "Tavola"}
            </span>
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            {settings?.tagline ?? "Modern Indian kitchen — order, dine, deliver."}
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            Order through a conversational assistant, track delivery in real time,
            or book a table — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/customer">
              <Button>
                <MessageSquareHeart className="h-4 w-4" />
                Order now
              </Button>
            </Link>
            <Link href="/reservations">
              <Button variant="outline">
                <CalendarClock className="h-4 w-4" />
                Reserve a table
              </Button>
            </Link>
            <Link href="/menu">
              <Button variant="ghost">
                Browse menu
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Featured menu */}
        {loaded && featured.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-6 pb-16">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Popular right now</h2>
              <Link
                href="/menu"
                className="text-sm font-medium text-primary hover:underline"
              >
                Full menu →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((item) => (
                <Card key={item.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{item.name}</h3>
                    <span className="shrink-0 font-semibold tabular-nums text-primary">
                      {formatPrice(item.priceCents)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  <span className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {item.category}
                  </span>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Role cards */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <Link key={r.href} href={r.href} className="group">
                  <Card className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-pop)]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="mt-4 flex items-center gap-1.5 text-lg font-semibold">
                      {r.title}
                      <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function SiteFooter() {
  const settings = useSettings();
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground">
        <span>
          © {new Date().getFullYear()} {settings?.name ?? "Tavola"}
        </span>
        <span>
          {settings?.phone} · {settings?.hours}
        </span>
      </div>
    </footer>
  );
}
