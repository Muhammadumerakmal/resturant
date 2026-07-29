"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame, Leaf, MessageCircle } from "lucide-react";
import { formatPrice, type MenuItem } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "../../_components/ui/Badge";
import { Button } from "../../_components/ui/Button";
import { Card } from "../../_components/ui/Card";
import { Skeleton } from "../../_components/ui/Skeleton";

// Same dietary-tag styling as the menu browse grid.
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

export default function MenuItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [item, setItem] = useState<MenuItem | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setItem(await apiFetch<MenuItem>(`/api/v1/menu/${id}`));
    } catch {
      setItem(null);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to menu
      </Link>

      {!loaded ? (
        <Skeleton className="mt-4 h-72 w-full" />
      ) : !item ? (
        <p className="mt-6 text-sm text-muted-foreground">Item not found.</p>
      ) : (
        <Card className={`mt-4 p-6 ${item.available ? "" : "opacity-70"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.category}
              </p>
              <h1 className="mt-1 text-2xl font-bold">{item.name}</h1>
            </div>
            <span className="shrink-0 text-xl font-bold tabular-nums text-primary">
              {formatPrice(item.priceCents)}
            </span>
          </div>

          {item.description && (
            <p className="mt-3 text-muted-foreground">{item.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {item.tags.map((t) => tagBadge(t))}
            {!item.available && <Badge tone="warning">Unavailable</Badge>}
          </div>

          <div className="mt-6">
            <Link href="/customer">
              <Button disabled={!item.available}>
                <MessageCircle className="h-4 w-4" />
                {item.available ? "Order this via chat" : "Currently unavailable"}
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </main>
  );
}
