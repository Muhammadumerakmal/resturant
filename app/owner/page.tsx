"use client";

import Link from "next/link";
import { useOrders } from "@/lib/useOrders";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/types";

export default function OwnerPage() {
  const { orders, error, loaded } = useOrders({ intervalMs: 3000 });

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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Owner Dashboard</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Home
        </Link>
      </div>
      {error && <p className="mt-2 text-sm text-amber-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="Revenue" value={formatPrice(revenueCents)} />
        <Stat label="Items sold" value={String(totalItems)} />
        {statusCounts.map((s) => (
          <Stat key={s.status} label={s.status} value={String(s.count)} />
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Recent orders
      </h2>
      {loaded && orders.length === 0 && (
        <p className="mt-4 text-neutral-500">No orders yet.</p>
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Source</th>
              <th className="py-2">Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-b border-neutral-100 dark:border-neutral-900"
              >
                <td className="py-2 pr-4 font-mono">#{o.id.slice(0, 8)}</td>
                <td className="py-2 pr-4">{o.status}</td>
                <td className="py-2 pr-4">
                  {o.items.reduce((s, it) => s + it.quantity, 0)}
                </td>
                <td className="py-2 pr-4">{o.source}</td>
                <td className="py-2 text-neutral-500">
                  {new Date(o.createdAt).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
    </div>
  );
}
