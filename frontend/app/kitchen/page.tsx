"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrders } from "@/lib/useOrders";
import { api } from "@/lib/api";
import { NEXT_STATUS, type OrderStatus } from "@repo/shared";

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  preparing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ready: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  served: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
};

export default function KitchenPage() {
  const { orders, error, loaded, refresh } = useOrders({ intervalMs: 2500 });
  const [busy, setBusy] = useState<string | null>(null);

  // Kitchen only cares about open orders.
  const open = orders.filter((o) => o.status !== "served");

  async function advance(id: string, current: OrderStatus) {
    const next = NEXT_STATUS[current];
    if (!next) return;
    setBusy(id);
    try {
      await fetch(api(`/api/v1/orders/${id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Kitchen Queue</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Home
        </Link>
      </div>
      {error && <p className="mt-2 text-sm text-amber-600">{error}</p>}
      {loaded && open.length === 0 && (
        <p className="mt-10 text-center text-neutral-500">No open orders.</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {open.map((o) => {
          const status = o.status as OrderStatus;
          const next = NEXT_STATUS[status];
          return (
            <div
              key={o.id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-neutral-500">
                  #{o.id.slice(0, 8)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
                >
                  {status}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((it) => (
                  <li key={it.id}>
                    <span className="font-medium">{it.quantity}×</span> {it.name}
                    {it.notes ? (
                      <span className="text-neutral-500"> — {it.notes}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {next && (
                <button
                  onClick={() => advance(o.id, status)}
                  disabled={busy === o.id}
                  className="mt-4 w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {busy === o.id ? "…" : `Mark ${next}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
