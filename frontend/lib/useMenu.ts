"use client";

import { useCallback, useEffect, useState } from "react";
import type { MenuItem } from "@repo/shared";
import { apiFetch } from "./api";

// Fetches the menu. Shared by the customer browse page and the owner admin page.
// Owner passes a staffKey + includeArchived to also see soft-deleted items.
export function useMenu(opts?: { staffKey?: string; includeArchived?: boolean }) {
  const staffKey = opts?.staffKey;
  const includeArchived = opts?.includeArchived ?? false;

  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = includeArchived ? "?includeArchived=1" : "";
      const data = await apiFetch<MenuItem[]>(`/api/v1/menu${qs}`, { staffKey });
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setLoaded(true);
    }
  }, [staffKey, includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, error, loaded, refresh: load };
}
