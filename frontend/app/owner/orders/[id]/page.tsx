"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bike, MapPin, Phone, User } from "lucide-react";
import { formatPrice, type OrderStatus, type OrderWithItems } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOwner } from "../../OwnerShell";
import { Badge } from "@/app/_components/ui/Badge";
import { Button } from "@/app/_components/ui/Button";
import { Card } from "@/app/_components/ui/Card";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { StatusPill } from "@/app/_components/ui/StatusPill";
import { useToast } from "@/app/_components/ui/Toast";

function total(o: OrderWithItems) {
  return o.items.reduce((s, it) => s + it.unitPriceCents * it.quantity, 0);
}

export default function OwnerOrderDetailPage() {
  const { staffKey } = useOwner();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const toast = useToast();

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await apiFetch<OrderWithItems>(`/api/v1/orders/${id}`, { staffKey }));
    } catch {
      setOrder(null);
    } finally {
      setLoaded(true);
    }
  }, [id, staffKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function dispatch() {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/orders/${id}/dispatch`, {
        method: "POST",
        body: {},
        staffKey,
      });
      toast("Order dispatched", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "warning");
    } finally {
      setBusy(false);
    }
  }

  async function markDelivered() {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/orders/${id}/delivered`, {
        method: "POST",
        body: {},
        staffKey,
      });
      toast("Marked delivered", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "warning");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 pt-6">
      <Link
        href="/owner/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      {!loaded ? (
        <Skeleton className="mt-4 h-64 w-full" />
      ) : !order ? (
        <p className="mt-6 text-sm text-muted-foreground">Order not found.</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-mono text-lg font-bold">
                  #{order.id.slice(0, 8)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <StatusPill status={order.status as OrderStatus} />
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
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Fulfillment
              </h2>
              <div className="mt-2">
                <Badge tone={order.orderType === "delivery" ? "info" : "neutral"}>
                  {order.orderType === "delivery" && <Bike className="h-3 w-3" />}
                  <span className="capitalize">
                    {order.orderType.replace("_", " ")}
                  </span>
                </Badge>
              </div>

              {order.orderType === "delivery" && (
                <div className="mt-4 space-y-2 text-sm">
                  {order.customerName && (
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {order.customerName}
                    </p>
                  )}
                  {order.customerPhone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {order.customerPhone}
                    </p>
                  )}
                  {order.deliveryAddress && (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      {order.deliveryAddress}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {order.orderType === "delivery" && (
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Delivery
                </h2>
                <div className="mt-3 space-y-2">
                  {!order.dispatchedAt ? (
                    <Button
                      className="w-full"
                      onClick={dispatch}
                      disabled={busy || order.status !== "ready"}
                    >
                      <Bike className="h-4 w-4" />
                      Dispatch courier
                    </Button>
                  ) : !order.deliveredAt ? (
                    <Button
                      className="w-full"
                      onClick={markDelivered}
                      disabled={busy}
                    >
                      Mark delivered
                    </Button>
                  ) : (
                    <Badge tone="success">Delivered</Badge>
                  )}
                  {order.status !== "ready" && !order.dispatchedAt && (
                    <p className="text-xs text-muted-foreground">
                      Dispatch once the kitchen marks it ready.
                    </p>
                  )}
                  <Link
                    href={`/track/${order.id}`}
                    className="block text-center text-xs text-primary hover:underline"
                  >
                    Open customer tracking →
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
