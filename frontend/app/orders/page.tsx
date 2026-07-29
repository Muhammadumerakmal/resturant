"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bike, LogIn, MessageCircle, Receipt } from "lucide-react";
import { formatPrice, type OrderWithItems } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useOrderHistory } from "@/lib/useOrderHistory";
import { Badge } from "../_components/ui/Badge";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { EmptyState } from "../_components/ui/EmptyState";
import { Skeleton } from "../_components/ui/Skeleton";
import { HomeLink, PageHeader } from "../_components/ui/PageHeader";

// A normalized row shape both sources (server + localStorage) render through.
type Row = {
  id: string;
  placedAt: string;
  itemCount: number;
  totalCents: number;
  isDelivery: boolean;
};

function orderToRow(o: OrderWithItems): Row {
  return {
    id: o.id,
    placedAt: o.createdAt as unknown as string,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    totalCents: o.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    isDelivery: o.orderType === "delivery",
  };
}

export default function OrderHistoryPage() {
  const { user, ready } = useAuth();
  const guest = useOrderHistory();

  const [serverRows, setServerRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);

  // When signed in, orders come from the account (authoritative across devices).
  useEffect(() => {
    if (!ready || !user) {
      setServerRows(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<OrderWithItems[]>("/api/v1/orders/mine")
      .then((orders) => {
        if (!cancelled) setServerRows(orders.map(orderToRow));
      })
      .catch(() => {
        if (!cancelled) setServerRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const rows: Row[] = user
    ? (serverRows ?? [])
    : guest.entries.map((e) => ({
        id: e.id,
        placedAt: e.placedAt,
        itemCount: e.itemCount,
        totalCents: e.totalCents,
        isDelivery: e.orderType === "delivery",
      }));

  const showLoading = !ready || (user && loading && serverRows === null) || (!user && !guest.ready);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <PageHeader
        title="Your Orders"
        subtitle={user ? `Signed in as ${user.email}` : "Orders placed from this device"}
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <>
            <Link href="/customer">
              <Button size="sm">
                <MessageCircle className="h-4 w-4" />
                New order
              </Button>
            </Link>
            <HomeLink />
          </>
        }
      />

      {ready && !user && (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground">
            Sign in to see every order tied to your account, on any device.
          </p>
          <Link href="/login?next=/orders">
            <Button size="sm" variant="outline">
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </Link>
        </Card>
      )}

      {showLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Receipt className="h-6 w-6" />}
          title="No orders yet"
          description="Your placed orders will show up here."
        />
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((e) => (
            <Card key={e.id} className="flex items-center justify-between p-4">
              <Link href={`/orders/${e.id}`} className="group flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm group-hover:underline">
                    #{e.id.slice(0, 8)}
                  </span>
                  {e.isDelivery && (
                    <Badge tone="info">
                      <Bike className="h-3 w-3" /> Delivery
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(e.placedAt).toLocaleString()} · {e.itemCount}{" "}
                  {e.itemCount === 1 ? "item" : "items"} · {formatPrice(e.totalCents)}
                </p>
              </Link>
              {e.isDelivery && (
                <Link
                  href={`/track/${e.id}`}
                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                >
                  Track →
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
