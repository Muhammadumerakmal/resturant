"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { RestaurantSettings } from "@repo/shared";
import { apiFetch } from "./api";

// Public restaurant profile (name/tagline/contact), shown across the website.
//
// The value is fetched ON THE SERVER in the root layout and handed to
// <SettingsProvider initial={...}>, so the server-rendered HTML already
// contains the real name/tagline — no flash of the "Umer Akmal Kitchen" fallback that then
// swaps to the fetched value. The provider still revalidates on the client so
// an owner edit shows up without a full reload, and it falls back to
// localStorage / the API when the server fetch was unavailable at render time.
//
// Consumers keep calling `useSettings()` and get `RestaurantSettings | null`.

const STORAGE_KEY = "tavola.settings";

const SettingsContext = createContext<RestaurantSettings | null>(null);

export function useSettings(): RestaurantSettings | null {
  return useContext(SettingsContext);
}

function readStorage(): RestaurantSettings | null {
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
    // ignore quota / private-mode failures
  }
}

export function SettingsProvider({
  initial,
  children,
}: {
  initial: RestaurantSettings | null;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<RestaurantSettings | null>(initial);

  useEffect(() => {
    // If the server couldn't provide a value (backend cold/unreachable at SSR),
    // paint the last-known value from localStorage immediately so we still avoid
    // the empty→value flash on the client.
    if (!initial) {
      const cached = readStorage();
      if (cached) setSettings(cached);
    }

    // Revalidate in the background so owner edits appear without a reload.
    // A failure here keeps whatever we already have (SSR value or cache).
    apiFetch<RestaurantSettings>("/api/v1/settings")
      .then((next) => {
        setSettings(next);
        writeStorage(next);
      })
      .catch(() => {});
  }, [initial]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
