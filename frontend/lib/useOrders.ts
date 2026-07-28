"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderWithItems } from "@repo/shared";
import { api } from "./api";

// Realtime order list (PRD §6.3): subscribes to the backend SSE stream and
// refetches on each order_change event; falls back to polling if SSE drops (§10).
export function useOrders(opts?: {
  status?: string;
  intervalMs?: number;
  staffKey?: string;
}) {
  const status = opts?.status;
  const intervalMs = opts?.intervalMs ?? 2500;
  const staffKey = opts?.staffKey;

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await fetch(api(`/api/v1/orders${qs}`), {
        cache: "no-store",
        headers: staffKey ? { "x-staff-key": staffKey } : {},
      });
      if (!res.ok) throw new Error(String(res.status));
      setOrders(await res.json());
      setError(null);
    } catch {
      setError("Connection lost — retrying…");
    } finally {
      setLoaded(true);
    }
  }, [status, staffKey]);

  useEffect(() => {
    load();

    let poll: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (!poll) poll = setInterval(load, intervalMs);
    };
    const stopPolling = () => {
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    };

    // Try realtime; EventSource can't send headers, so the key rides the query.
    let es: EventSource | null = null;
    try {
      const url = api(
        `/api/v1/orders/stream${staffKey ? `?key=${encodeURIComponent(staffKey)}` : ""}`,
      );
      es = new EventSource(url);
      es.onopen = () => {
        setLive(true);
        stopPolling();
      };
      es.addEventListener("order_change", () => load());
      es.onerror = () => {
        // Browser auto-reconnects; meanwhile poll so the UI stays fresh.
        setLive(false);
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      es?.close();
      stopPolling();
    };
  }, [load, intervalMs, staffKey]);

  return { orders, error, loaded, live, refresh: load };
}
