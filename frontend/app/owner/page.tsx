"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Receipt, ShoppingBag, TrendingUp } from "lucide-react";
import { formatPrice, type OrderStatus } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOwner } from "./OwnerShell";
import { Card } from "@/app/_components/ui/Card";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Stat } from "@/app/_components/ui/Stat";
import { StatusPill } from "@/app/_components/ui/StatusPill";
import { Tabs } from "@/app/_components/ui/Tabs";
import {
  RevenueLineChart,
  type RevenuePoint,
} from "@/app/_components/ui/charts/RevenueLineChart";
import {
  TopItemsBarChart,
  type TopItemPoint,
} from "@/app/_components/ui/charts/TopItemsBarChart";

interface Analytics {
  summary: {
    revenueCents: number;
    orderCount: number;
    itemCount: number;
    avgOrderCents: number;
  };
  statusCounts: { status: OrderStatus; count: number }[];
  topItems: TopItemPoint[];
  revenueOverTime: RevenuePoint[];
}

type RangeKey = "today" | "7d" | "30d" | "all";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All" },
];

function rangeFrom(key: RangeKey): string | undefined {
  const now = new Date();
  if (key === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (key === "7d") return new Date(now.getTime() - 7 * 864e5).toISOString();
  if (key === "30d") return new Date(now.getTime() - 30 * 864e5).toISOString();
  return undefined;
}

export default function OwnerDashboardPage() {
  const { staffKey } = useOwner();
  const [range, setRange] = useState<RangeKey>("7d");
  const [data, setData] = useState<Analytics | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoaded(false);
    try {
      const from = rangeFrom(range);
      const qs = from ? `?from=${encodeURIComponent(from)}` : "";
      setData(await apiFetch<Analytics>(`/api/v1/analytics${qs}`, { staffKey }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoaded(true);
    }
  }, [range, staffKey]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Dashboard"
        subtitle="Sales and order analytics"
        icon={<TrendingUp className="h-5 w-5" />}
        actions={
          <Tabs
            options={RANGE_OPTIONS}
            value={range}
            onChange={(v) => setRange(v)}
          />
        }
      />

      {error && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{error}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Revenue"
          value={data ? formatPrice(data.summary.revenueCents) : "—"}
          icon={<Receipt className="h-4 w-4" />}
          accent
        />
        <Stat
          label="Orders"
          value={data ? data.summary.orderCount : "—"}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <Stat
          label="Items sold"
          value={data ? data.summary.itemCount : "—"}
          icon={<Package className="h-4 w-4" />}
        />
        <Stat
          label="Avg order"
          value={data ? formatPrice(data.summary.avgOrderCents) : "—"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Revenue over time
          </h2>
          <div className="mt-3">
            {!loaded ? (
              <Skeleton className="h-64 w-full" />
            ) : data && data.revenueOverTime.length > 0 ? (
              <RevenueLineChart data={data.revenueOverTime} />
            ) : (
              <EmptyState
                title="No sales in this range"
                description="Try a wider date range."
              />
            )}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Top items
          </h2>
          <div className="mt-3">
            {!loaded ? (
              <Skeleton className="h-64 w-full" />
            ) : data && data.topItems.length > 0 ? (
              <TopItemsBarChart data={data.topItems} />
            ) : (
              <EmptyState title="No items sold yet" />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(data?.statusCounts ?? []).map((s) => (
          <Card key={s.status} className="flex items-center justify-between p-3.5">
            <StatusPill status={s.status} />
            <span className="text-lg font-bold tabular-nums">{s.count}</span>
          </Card>
        ))}
      </div>
    </main>
  );
}
