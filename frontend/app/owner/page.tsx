"use client";

import { LogOut, Package, Radio, Receipt, ShoppingBag } from "lucide-react";
import { useOrders } from "@/lib/useOrders";
import { useStaffKey } from "@/lib/useStaffKey";
import { cn } from "@/lib/cn";
import { StaffGate } from "../_components/StaffGate";
import { formatPrice } from "@repo/shared";
import { ORDER_STATUSES, type OrderStatus } from "@repo/shared";
import { Card } from "../_components/ui/Card";
import { EmptyState } from "../_components/ui/EmptyState";
import { HomeLink, PageHeader } from "../_components/ui/PageHeader";
import { Stat } from "../_components/ui/Stat";
import { StatusPill } from "../_components/ui/StatusPill";

export default function OwnerPage() {
  const { key, ready, save, clear } = useStaffKey();
  if (!ready) return null;
  if (!key) return <StaffGate title="Owner Dashboard" onSubmit={save} />;
  return <OwnerBoard staffKey={key} onSignOut={clear} />;
}

function OwnerBoard({
  staffKey,
  onSignOut,
}: {
  staffKey: string;
  onSignOut: () => void;
}) {
  const { orders, error, loaded, live } = useOrders({
    intervalMs: 3000,
    staffKey,
  });

  const revenueCents = orders.reduce(
    (sum, o) =>
      sum + o.items.reduce((s, it) => s + it.unitPriceCents * it.quantity, 0),
    0,
  );
  const statusCounts = ORDER_STATUSES.map((s) => ({
    status: s,
    count: orders.filter((o) => o.status === s).length,
  }));
  const totalItems = orders.reduce(
    (n, o) => n + o.items.reduce((s, it) => s + it.quantity, 0),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <PageHeader
        title="Owner Dashboard"
        subtitle="Live orders and daily totals"
        icon={<Receipt className="h-5 w-5" />}
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
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat
          label="Orders"
          value={orders.length}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <Stat
          label="Revenue"
          value={formatPrice(revenueCents)}
          icon={<Receipt className="h-4 w-4" />}
          accent
        />
        <Stat
          label="Items sold"
          value={totalItems}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statusCounts.map((s) => (
          <Card
            key={s.status}
            className="flex items-center justify-between p-3.5"
          >
            <StatusPill status={s.status} />
            <span className="text-lg font-bold tabular-nums">{s.count}</span>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recent orders
      </h2>

      {loaded && orders.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<ShoppingBag className="h-6 w-6" />}
          title="No orders yet"
          description="Orders will appear here as customers place them."
        />
      ) : (
        <Card className="mt-3 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Items</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                      #{o.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={o.status as OrderStatus} />
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {o.items.reduce((s, it) => s + it.quantity, 0)}
                    </td>
                    <td className="px-4 py-2.5 capitalize">{o.source}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}
