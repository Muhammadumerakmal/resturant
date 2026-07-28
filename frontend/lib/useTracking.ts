"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrackingState } from "@repo/shared";
import { apiFetch } from "./api";

// Polls the public tracking endpoint for a delivery order. The /track page is
// public (no staff key), so polling — not the staff-gated SSE stream — is the fit.
export function useTracking(orderId: string, intervalMs = 2500) {
  const [state, setState] = useState<TrackingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<TrackingState>(
        `/api/v1/orders/${orderId}/tracking`,
      );
      setState(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tracking");
    } finally {
      setLoaded(true);
    }
  }, [orderId]);

  useEffect(() => {
    load();
    // Stop polling once delivered — nothing more will change.
    const poll = setInterval(() => {
      setState((cur) => {
        if (cur?.stage === "delivered") return cur;
        load();
        return cur;
      });
    }, intervalMs);
    return () => clearInterval(poll);
  }, [load, intervalMs]);

  return { state, error, loaded, refresh: load };
}
