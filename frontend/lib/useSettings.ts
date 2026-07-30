"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RestaurantSettings } from "@repo/shared";
import { apiFetch } from "./api";

// Public restaurant profile (name/tagline/contact), shown across the website.
//
// Backed by a small shared store instead of a per-component fetch. Why:
//   - Every consumer used to start at `null` and render a hardcoded fallback
//     ("Tavola" / default tagline), then swap to the real value once its own
//     fetch resolved. On a cold backend that swap lands ~2s late, so the wrong
//     ("old") name is visible the whole time — the flash this fixes.
//   - Each call site fetched independently (nav, hero, footer…), so parts of the
//     page updated at different moments.
// Now there is ONE in-flight fetch shared by all consumers, the last-known value
// is persisted to localStorage so repeat visits paint the correct name on the
// first frame (no wrong→right swap), and a background revalidate keeps it fresh.

const STORAGE_KEY = "tavola.settings";

let cache: RestaurantSettings | null = readStorage();
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function readStorage(): RestaurantSettings | null {
  if (typeof window === "undefined") return null; // SSR: nothing persisted
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RestaurantSettings) : null;
  } catch {
    return null;
  }
}

function writeStorage(value: RestaurantSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota / private-mode failures — the in-memory cache still works
  }
}

// Fetch once; coalesce concurrent callers onto the same request. On success,
// update the cache + storage and notify subscribers. On failure, keep the
// last-known value (a cold-start blip shouldn't wipe the name off the page).
function revalidate(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = apiFetch<RestaurantSettings>("/api/v1/settings")
    .then((next) => {
      cache = next;
      writeStorage(next);
      for (const notify of listeners) notify();
    })
    .catch(() => {
      // keep cache as-is
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useSettings(): RestaurantSettings | null {
  const settings = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => cache, // client snapshot: the shared (possibly localStorage-seeded) value
    () => null, // server snapshot: always null so SSR matches the pre-fetch client
  );

  useEffect(() => {
    void revalidate();
  }, []);

  return settings;
}
