"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, ScrollText, ShoppingBag } from "lucide-react";
import {
  ORDER_STATUSES,
  formatPrice,
  type OrderStatus,
  type OrderWithItems,
} from "@repo/shared";
import { useOrders } from "@/lib/useOrders";
import { useOwner, LivePill } from "../OwnerShell";
import { Badge } from "@/app/_components/ui/Badge";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { StatusPill } from "@/app/_components/ui/StatusPill";
import { Tabs } from "@/app/_components/ui/Tabs";
import { Table, TD, TH, THead, TR } from "@/app/_components/ui/Table";

type Filter = "all" | OrderStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...ORDER_STATUSES.map((s) => ({ value: s as Filter, label: s })),
];

function orderTotal(o: OrderWithItems) {
  return o.items.reduce((s, it) => s + it.unitPriceCents * it.quantity, 0);
}

export default function OwnerOrdersPage() {
  const { staffKey } = useOwner();
  const { orders, loaded, live } = useOrders({ staffKey, intervalMs: 3000 });
  const [filter, setFilter] = useState<Filter>("all");
  const router = useRouter();

  const rows =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Orders"
        subtitle="All orders, newest first"
        icon={<ScrollText className="h-5 w-5" />}
        actions={<LivePill live={live} />}
      />

      <div className="mt-5">
        <Tabs
          options={FILTERS.map((f) => ({
            value: f.value,
            label: <span className="capitalize">{f.label}</span>,
          }))}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <div className="mt-4">
        {!loaded ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="No orders"
            description="Orders will appear here as customers place them."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Status</TH>
                <TH>Type</TH>
                <TH className="text-right">Items</TH>
                <TH className="text-right">Total</TH>
                <TH>Placed</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((o) => (
                <TR
                  key={o.id}
                  onClick={() => router.push(`/owner/orders/${o.id}`)}
                >
                  <TD className="font-mono text-muted-foreground">
                    #{o.id.slice(0, 8)}
                  </TD>
                  <TD>
                    <StatusPill status={o.status as OrderStatus} />
                  </TD>
                  <TD>
                    {o.orderType === "delivery" ? (
                      <Badge tone="info">
                        <Bike className="h-3 w-3" /> Delivery
                      </Badge>
                    ) : (
                      <Badge>{o.orderType.replace("_", " ")}</Badge>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {o.items.reduce((s, it) => s + it.quantity, 0)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatPrice(orderTotal(o))}
                  </TD>
                  <TD className="text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString()}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </main>
  );
}
