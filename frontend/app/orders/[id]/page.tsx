"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bike, RefreshCw } from "lucide-react";
import {
  formatPrice,
  ORDER_STATUSES,
  type OrderStatus,
  type OrderWithItems,
} from "@repo/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useOrderHistory } from "@/lib/useOrderHistory";
import { Button } from "../../_components/ui/Button";
import { Card } from "../../_components/ui/Card";
import { Skeleton } from "../../_components/ui/Skeleton";
import { StatusPill } from "../../_components/ui/StatusPill";
import { Timeline } from "../../_components/ui/Timeline";
import { useToast } from "../../_components/ui/Toast";

const STEP_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

function total(o: OrderWithItems) {
  return o.items.reduce((s, it) => s + it.unitPriceCents * it.quantity, 0);
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const toast = useToast();
  const { user, ready } = useAuth();
  const guest = useOrderHistory();

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    // Signed-in customers get the full itemized order (ownership-checked on the
    // backend). Guests only have a local summary, handled separately below.
    if (!ready) return;
    if (!user) {
      setLoaded(true);
      return;
    }
    try {
      setOrder(
        await apiFetch<OrderWithItems>(`/api/v1/orders/mine/${id}`),
      );
    } catch {
      setOrder(null);
    } finally {
      setLoaded(true);
    }
  }, [ready, user, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function reorder() {
    if (!order) return;
    setBusy(true);
    try {
      const created = await apiFetch<OrderWithItems>("/api/v1/orders", {
        method: "POST",
        body: {
          source: "manual",
          items: order.items.map((it) => ({
            menu_item_id: it.menuItemId,
            quantity: it.quantity,
            ...(it.notes ? { notes: it.notes } : {}),
          })),
        },
      });
      toast("Reordered — new order placed", "success");
      router.push(`/orders/${created.id}`);
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Couldn't reorder — try again.",
        "warning",
      );
    } finally {
      setBusy(false);
    }
  }

  const backLink = (
    <Link
      href="/orders"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to orders
    </Link>
  );

  // Guest fallback: no account order, show the local summary if we have it.
  if (loaded && !user) {
    const entry = guest.entries.find((e) => e.id === id);
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        {backLink}
        {!entry ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Order not found on this device.{" "}
            <Link href="/login?next=/orders" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to see orders tied to your account.
          </p>
        ) : (
          <Card className="mt-4 p-5">
            <h1 className="font-mono text-lg font-bold">#{entry.id.slice(0, 8)}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(entry.placedAt).toLocaleString()}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-base font-bold">
              <span>
                {entry.itemCount} {entry.itemCount === 1 ? "item" : "items"}
              </span>
              <span className="tabular-nums">{formatPrice(entry.totalCents)}</span>
            </div>
            {entry.orderType === "delivery" && (
              <Link href={`/track/${entry.id}`} className="mt-4 block">
                <Button className="w-full" variant="outline">
                  <Bike className="h-4 w-4" /> Track delivery
                </Button>
              </Link>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Sign in to see the full itemized receipt for your account orders.
            </p>
          </Card>
        )}
      </main>
    );
  }

  const status = (order?.status ?? "received") as OrderStatus;
  const currentIdx = ORDER_STATUSES.indexOf(status);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      {backLink}

      {!loaded ? (
        <Skeleton className="mt-4 h-64 w-full" />
      ) : !order ? (
        <p className="mt-6 text-sm text-muted-foreground">Order not found.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-mono text-lg font-bold">
                  #{order.id.slice(0, 8)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <StatusPill status={status} />
            </div>

            <div className="mt-5 divide-y divide-border">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-start justify-between py-3">
                  <div>
                    <span className="font-medium">
                      {it.quantity}× {it.name}
                    </span>
                    {it.notes && (
                      <p className="text-sm text-muted-foreground">{it.notes}</p>
                    )}
                  </div>
                  <span className="tabular-nums">
                    {formatPrice(it.unitPriceCents * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total(order))}</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={reorder} disabled={busy}>
                <RefreshCw className="h-4 w-4" />
                {busy ? "Reordering…" : "Reorder"}
              </Button>
              {order.orderType === "delivery" && (
                <Link href={`/track/${order.id}`}>
                  <Button variant="outline">
                    <Bike className="h-4 w-4" /> Track delivery
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </h2>
            <Timeline
              steps={ORDER_STATUSES.map((s, i) => ({
                label: STEP_LABELS[s],
                done: i < currentIdx,
                active: i === currentIdx,
              }))}
            />
          </Card>
        </div>
      )}
    </main>
  );
}
