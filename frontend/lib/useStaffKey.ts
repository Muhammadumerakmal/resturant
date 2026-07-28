"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "staff_key";

// Simple staff-key gate for kitchen/owner (PRD §9). The key is kept in
// localStorage and sent to the backend (header for fetch, ?key= for SSE).
export function useStaffKey() {
  const [key, setKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setKey(localStorage.getItem(STORAGE_KEY));
    setReady(true);
  }, []);

  const save = (value: string) => {
    const v = value.trim();
    localStorage.setItem(STORAGE_KEY, v);
    setKey(v);
  };
  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setKey(null);
  };

  return { key, ready, save, clear };
}
