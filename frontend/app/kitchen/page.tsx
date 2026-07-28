"use client";

import { useState } from "react";
import { ChefHat, ClipboardList, LogOut, Radio } from "lucide-react";
import { useOrders } from "@/lib/useOrders";
import { useStaffKey } from "@/lib/useStaffKey";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { StaffGate } from "../_components/StaffGate";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { EmptyState } from "../_components/ui/EmptyState";
import { HomeLink, PageHeader } from "../_components/ui/PageHeader";
import { StatusPill } from "../_components/ui/StatusPill";
import { NEXT_STATUS, type OrderStatus } from "@repo/shared";

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

  const open = orders.filter((o) => o.status !== "served");

  async function advance(id: string, current: OrderStatus) {
    const next = NEXT_STATUS[current];
    if (!next) return;
    setBusy(id);
    try {
      await fetch(api(`/api/v1/orders/${id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-staff-key": staffKey },
        body: JSON.stringify({ status: next }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
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
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
          {error}
        </p>
      )}

      {loaded && open.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<ClipboardList className="h-6 w-6" />}
          title="All caught up"
          description="No open orders right now."
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((o) => {
            const status = o.status as OrderStatus;
            const next = NEXT_STATUS[status];
            return (
              <Card key={o.id} className="flex flex-col p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-muted-foreground">
                    #{o.id.slice(0, 8)}
                  </span>
                  <StatusPill status={status} />
                </div>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex gap-2">
                      <span className="font-semibold text-primary">
                        {it.quantity}×
                      </span>
                      <span>
                        {it.name}
                        {it.notes ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {it.notes}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
                {next && (
                  <Button
                    onClick={() => advance(o.id, status)}
                    disabled={busy === o.id}
                    className="mt-4 w-full capitalize"
                  >
                    {busy === o.id ? "Updating…" : `Mark ${next}`}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
