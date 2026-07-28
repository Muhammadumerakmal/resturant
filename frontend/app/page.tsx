import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChefHat,
  MessageSquareHeart,
  Receipt,
  UtensilsCrossed,
} from "lucide-react";
import { Card } from "./_components/ui/Card";

const ROLES = [
  {
    href: "/customer",
    title: "Customer",
    desc: "Chat with the ordering assistant and place an order.",
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
    desc: "Live orders and basic daily sales totals.",
    icon: BarChart3,
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:py-24">
      <div className="flex items-center gap-2 text-primary">
        <UtensilsCrossed className="h-5 w-5" />
        <span className="text-sm font-semibold uppercase tracking-widest">
          Tavola
        </span>
      </div>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Order by conversation.
      </h1>
      <p className="mt-3 max-w-xl text-lg text-muted-foreground">
        A restaurant ordering experience where customers talk to an AI assistant,
        the kitchen sees a live queue, and the owner watches sales in real time.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
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

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" />
          Browse the menu
        </Link>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Receipt className="h-4 w-4" />
          Your orders
        </Link>
      </div>
    </main>
  );
}
