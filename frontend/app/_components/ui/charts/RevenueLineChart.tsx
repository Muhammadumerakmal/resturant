"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@repo/shared";

export interface RevenuePoint {
  date: string; // ISO day or label
  revenueCents: number;
  orders: number;
}

// Revenue-over-time area chart. Colors come from the app's CSS design tokens so
// it themes with the rest of the UI (light + dark).
export function RevenueLineChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={formatDay}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => `$${Math.round(Number(v) / 100)}`}
            stroke="var(--border)"
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            labelFormatter={formatDay}
            formatter={(value: number, name) =>
              name === "revenueCents"
                ? [formatPrice(value), "Revenue"]
                : [value, "Orders"]
            }
          />
          <Area
            type="monotone"
            dataKey="revenueCents"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#revFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatDay(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
