"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderWithItems } from "@repo/shared";

// Polling client for the order list (PRD §6.3 baseline). SSE replaces this later.
export function useOrders(opts?: { status?: string; intervalMs?: number }) {
  const status = opts?.status;
  const intervalMs = opts?.intervalMs ?? 2500;

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await fetch(`/api/v1/orders${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setOrders(await res.json());
      setError(null);
    } catch {
      setError("Connection lost — retrying…");
    } finally {
      setLoaded(true);
    }
  }, [status]);

  useEffect(() => {
    load();
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs]);

  return { orders, error, loaded, refresh: load };
}
