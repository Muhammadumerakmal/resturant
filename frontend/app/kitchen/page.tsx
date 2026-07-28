"use client";

import { useEffect, useRef, useState } from "react";
import { Bike, ChefHat, ClipboardList, LogOut, Radio } from "lucide-react";
import {
  NEXT_STATUS,
  type OrderStatus,
  type OrderWithItems,
} from "@repo/shared";
import { useOrders } from "@/lib/useOrders";
import { useStaffKey } from "@/lib/useStaffKey";
import { useOrderSound } from "@/lib/useOrderSound";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { StaffGate } from "../_components/StaffGate";
import { OrderAgeBadge } from "../_components/OrderAgeBadge";
import { Badge } from "../_components/ui/Badge";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { EmptyState } from "../_components/ui/EmptyState";
import { HomeLink, PageHeader } from "../_components/ui/PageHeader";
import { KanbanColumn } from "../_components/ui/KanbanColumn";
import { useToast } from "../_components/ui/Toast";

// The kitchen board only shows work-in-progress columns; `served` is done.
const COLUMNS: OrderStatus[] = ["received", "preparing", "ready"];

export default function KitchenPage() {
  const { key, ready, save, clear } = useStaffKey();
  if (!ready) return null;
  if (!key) return <StaffGate title="Kitchen Queue" onSubmit={save} />;
  return <KitchenBoard staffKey={key} onSignOut={clear} />;
}

function KitchenBoard({
  staffKey,
  onSignOut,
}: {
  staffKey: string;
  onSignOut: () => void;
}) {
  const { orders, error, loaded, live, refresh } = useOrders({
    intervalMs: 2500,
    staffKey,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const playChime = useOrderSound();

  // Announce newly arrived orders (chime + toast). Skip the very first load so we
  // don't fanfare the existing backlog.
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(orders.map((o) => o.id));
    if (seenRef.current === null) {
      seenRef.current = ids;
      return;
    }
    const fresh = orders.filter(
      (o) => !seenRef.current!.has(o.id) && o.status === "received",
    );
    if (fresh.length > 0) {
      playChime();
      toast(
        fresh.length === 1
          ? `New order #${fresh[0].id.slice(0, 8)}`
          : `${fresh.length} new orders`,
        "success",
      );
    }
    seenRef.current = ids;
  }, [orders, loaded, playChime, toast]);

  const open = orders.filter((o) => o.status !== "served");
  const byStatus = (s: OrderStatus) => open.filter((o) => o.status === s);

  async function advance(id: string, current: OrderStatus) {
    const next = NEXT_STATUS[current];
    if (!next) return;
    setBusy(id);
    try {
      await apiFetch(`/api/v1/orders/${id}/status`, {
        method: "PATCH",
        body: { status: next },
        staffKey,
      });
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "warning");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
      <PageHeader
        title="Kitchen Queue"
        subtitle={`${open.length} open ${open.length === 1 ? "order" : "orders"}`}
        icon={<ChefHat className="h-5 w-5" />}
        actions={
          <>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                live
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-muted text-muted-foreground",
              )}
              title={live ? "Realtime (SSE) connected" : "Polling"}
            >
              <Radio className={cn("h-3.5 w-3.5", live && "animate-pulse")} />
              {live ? "Live" : "Polling"}
            </span>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
            <HomeLink />
          </>
        }
      />

      {error && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{error}</p>
      )}

      {loaded && open.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<ClipboardList className="h-6 w-6" />}
          title="All caught up"
          description="No open orders right now."
        />
      ) : (
        <div className="mt-6 grid flex-1 auto-rows-fr gap-4 lg:grid-cols-3">
          {COLUMNS.map((status) => {
            const items = byStatus(status);
            return (
              <KanbanColumn key={status} status={status} count={items.length}>
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Nothing here
                  </p>
                ) : (
                  items.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      busy={busy === o.id}
                      onAdvance={() => advance(o.id, o.status as OrderStatus)}
                    />
                  ))
                )}
              </KanbanColumn>
            );
          })}
        </div>
      )}
    </main>
  );
}

function OrderCard({
  order,
  busy,
  onAdvance,
}: {
  order: OrderWithItems;
  busy: boolean;
  onAdvance: () => void;
}) {
  const status = order.status as OrderStatus;
  const next = NEXT_STATUS[status];
  return (
    <Card className="flex flex-col p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-muted-foreground">
          #{order.id.slice(0, 8)}
        </span>
        <OrderAgeBadge createdAt={order.createdAt} />
      </div>
      {order.orderType === "delivery" && (
        <div className="mt-2">
          <Badge tone="info">
            <Bike className="h-3 w-3" /> Delivery
          </Badge>
        </div>
      )}
      <ul className="mt-3 flex-1 space-y-1.5 text-sm">
        {order.items.map((it) => (
          <li key={it.id} className="flex gap-2">
            <span className="font-semibold text-primary">{it.quantity}×</span>
            <span>
              {it.name}
              {it.notes ? (
                <span className="text-muted-foreground"> — {it.notes}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {next && (
        <Button
          onClick={onAdvance}
          disabled={busy}
          size="sm"
          className="mt-3 w-full capitalize"
        >
          {busy ? "Updating…" : `Mark ${next}`}
        </Button>
      )}
    </Card>
  );
}
