"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MenuItem, OrderWithItems } from "@/lib/types";
import { formatPrice } from "@/lib/format";

type Draft = Record<string, { quantity: number; notes: string }>;

export default function CustomerPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<OrderWithItems | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/menu")
      .then((r) => r.json())
      .then((data: MenuItem[]) => setMenu(data))
      .catch(() => setError("Could not load the menu."))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menu) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return [...map.entries()];
  }, [menu]);

  const selected = Object.entries(draft).filter(([, v]) => v.quantity > 0);
  const total = selected.reduce((sum, [id, v]) => {
    const item = menu.find((m) => m.id === id);
    return sum + (item ? item.priceCents * v.quantity : 0);
  }, 0);

  function setQty(id: string, quantity: number) {
    setDraft((d) => ({
      ...d,
      [id]: { quantity: Math.max(0, quantity), notes: d[id]?.notes ?? "" },
    }));
  }
  function setNotes(id: string, notes: string) {
    setDraft((d) => ({
      ...d,
      [id]: { quantity: d[id]?.quantity ?? 0, notes },
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "manual",
          items: selected.map(([menu_item_id, v]) => ({
            menu_item_id,
            quantity: v.quantity,
            ...(v.notes.trim() ? { notes: v.notes.trim() } : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Order failed");
      setPlaced(data as OrderWithItems);
      setDraft({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold">Order placed ✅</h1>
        <p className="mt-1 text-neutral-500">
          Order <span className="font-mono">{placed.id.slice(0, 8)}</span> — status:{" "}
          <span className="font-semibold">{placed.status}</span>
        </p>
        <ul className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {placed.items.map((it) => (
            <li key={it.id} className="flex justify-between px-4 py-2">
              <span>
                {it.quantity} × {it.name}
                {it.notes ? (
                  <span className="text-neutral-500"> — {it.notes}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setPlaced(null)}
          className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Place another order
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Menu</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Home
        </Link>
      </div>

      {loading && <p className="mt-6 text-neutral-500">Loading menu…</p>}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {categories.map(([category, items]) => (
        <section key={category} className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {category}
          </h2>
          <div className="space-y-3">
            {items.map((item) => {
              const qty = draft[item.id]?.quantity ?? 0;
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="font-medium">
                        {item.name}{" "}
                        {!item.available && (
                          <span className="text-xs text-red-500">(unavailable)</span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-sm text-neutral-500">
                          {item.description}
                        </div>
                      )}
                      {item.tags.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {item.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatPrice(item.priceCents)}</div>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => setQty(item.id, qty - 1)}
                          disabled={!item.available || qty === 0}
                          className="h-7 w-7 rounded border border-neutral-300 disabled:opacity-30 dark:border-neutral-700"
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{qty}</span>
                        <button
                          onClick={() => setQty(item.id, qty + 1)}
                          disabled={!item.available}
                          className="h-7 w-7 rounded border border-neutral-300 disabled:opacity-30 dark:border-neutral-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  {qty > 0 && (
                    <input
                      value={draft[item.id]?.notes ?? ""}
                      onChange={(e) => setNotes(item.id, e.target.value)}
                      placeholder="Notes (e.g. extra spicy)"
                      className="mt-3 w-full rounded border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {selected.length > 0 && (
        <div className="sticky bottom-4 mt-8 flex items-center justify-between rounded-xl border border-neutral-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div>
            <div className="text-sm text-neutral-500">
              {selected.reduce((n, [, v]) => n + v.quantity, 0)} items
            </div>
            <div className="text-lg font-semibold">{formatPrice(total)}</div>
          </div>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Placing…" : "Place order"}
          </button>
        </div>
      )}
    </main>
  );
}
