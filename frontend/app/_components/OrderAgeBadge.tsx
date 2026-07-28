"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";

// Live "time since the order was placed" badge. Color escalates the longer an
// order sits: calm under 5 min, amber by 10, red past 15 — so the kitchen can
// spot orders that are aging. Re-renders every 15s via a shared-ish local tick.
export function OrderAgeBadge({ createdAt }: { createdAt: string | Date }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const ms = now - new Date(createdAt).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));

  const tone =
    mins >= 15
      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : mins >= 10
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        tone,
      )}
    >
      <Clock className="h-3 w-3" />
      {label(mins)}
    </span>
  );
}

function label(mins: number) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}
