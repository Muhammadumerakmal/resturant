"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "order_history";
const MAX = 50;

export interface OrderHistoryEntry {
  id: string;
  orderType: string;
  placedAt: string; // ISO
  totalCents: number;
  itemCount: number;
}

// Remembers orders placed from THIS browser (no customer accounts in v1) so the
// customer can revisit them and open their /track page. Backed by localStorage.
export function useOrderHistory() {
  const [entries, setEntries] = useState<OrderHistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  const add = useCallback((entry: OrderHistoryEntry) => {
    setEntries((cur) => {
      const next = [entry, ...cur.filter((e) => e.id !== entry.id)].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  return { entries, ready, add };
}
