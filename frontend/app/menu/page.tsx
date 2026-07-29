"use client";

import Link from "next/link";
import { Leaf, Flame, MessageCircle, UtensilsCrossed } from "lucide-react";
import { formatPrice, type MenuItem } from "@repo/shared";
import { useMenu } from "@/lib/useMenu";
import { Badge } from "../_components/ui/Badge";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { EmptyState } from "../_components/ui/EmptyState";
import { HomeLink, PageHeader } from "../_components/ui/PageHeader";
import { Skeleton } from "../_components/ui/Skeleton";

function groupByCategory(items: MenuItem[]) {
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups.entries()];
}

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

export default function MenuPage() {
  const { items, loaded } = useMenu();
  const groups = groupByCategory(items);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <PageHeader
        title="Our Menu"
        subtitle="Browse the kitchen — then order by chat"
        icon={<UtensilsCrossed className="h-5 w-5" />}
        actions={
          <>
            <Link href="/customer">
              <Button size="sm">
                <MessageCircle className="h-4 w-4" />
                Order now
              </Button>
            </Link>
            <HomeLink />
          </>
        }
      />

      {!loaded ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title="Menu coming soon"
          description="No items are available right now."
        />
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map(([category, list]) => (
            <section key={category}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {list.map((item) => (
                  <Link key={item.id} href={`/menu/${item.id}`} className="group">
                    <Card
                      className={`flex h-full flex-col p-4 transition-colors group-hover:border-primary/40 ${item.available ? "" : "opacity-60"}`}
                    >
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
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {item.tags.map((t) => tagBadge(t))}
                        {!item.available && (
                          <Badge tone="warning">Unavailable</Badge>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
