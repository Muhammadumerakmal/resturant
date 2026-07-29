"use client";

import { useEffect, useState } from "react";
import type { RestaurantSettings } from "@repo/shared";
import { apiFetch } from "./api";

// Public restaurant profile (name/tagline/contact), shown across the website.
export function useSettings() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  useEffect(() => {
    apiFetch<RestaurantSettings>("/api/v1/settings")
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  return settings;
}
