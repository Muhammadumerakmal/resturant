"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import {
  formatPrice,
  type CustomerSummary,
  type OrderWithItems,
} from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOwner } from "../OwnerShell";
import { Card } from "@/app/_components/ui/Card";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { Modal } from "@/app/_components/ui/Modal";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/app/_components/ui/Table";

export default function OwnerCustomersPage() {
  const { staffKey } = useOwner();
  const [customers, setCustomers] = useState<CustomerSummary[] | null>(null);
  const [selected, setSelected] = useState<CustomerSummary | null>(null);

  useEffect(() => {
    apiFetch<CustomerSummary[]>("/api/v1/customers", { staffKey })
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [staffKey]);

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Customers"
        subtitle="Everyone who's ordered delivery, by phone number"
        icon={<Users className="h-5 w-5" />}
      />

      <div className="mt-6">
        {customers === null ? (
          <Skeleton className="h-64 w-full" />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No customers yet"
            description="Delivery customers appear here once orders come in."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Customer</TH>
                <TH>Phone</TH>
                <TH className="text-right">Orders</TH>
                <TH className="text-right">Total spent</TH>
                <TH>Last order</TH>
              </tr>
            </THead>
            <tbody>
              {customers.map((c) => (
                <TR key={c.phone} onClick={() => setSelected(c)}>
                  <TD className="font-medium">{c.name ?? "—"}</TD>
                  <TD className="text-muted-foreground">{c.phone}</TD>
                  <TD className="text-right tabular-nums">{c.orderCount}</TD>
                  <TD className="text-right tabular-nums">
                    {formatPrice(c.totalSpentCents)}
                  </TD>
                  <TD className="text-muted-foreground">
                    {new Date(c.lastOrderAt).toLocaleDateString()}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name ?? "Customer"} · ${selected.phone}` : ""}
      >
        {selected && <CustomerHistory phone={selected.phone} staffKey={staffKey} />}
      </Modal>
    </main>
  );
}

function CustomerHistory({ phone, staffKey }: { phone: string; staffKey: string }) {
  const [orders, setOrders] = useState<OrderWithItems[] | null>(null);

  useEffect(() => {
    apiFetch<OrderWithItems[]>(
      `/api/v1/customers/${encodeURIComponent(phone)}/orders`,
      { staffKey },
    )
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [phone, staffKey]);

  if (orders === null) return <Skeleton className="h-40 w-full" />;
  if (orders.length === 0)
    return <p className="text-sm text-muted-foreground">No orders found.</p>;

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id} className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-muted-foreground">
              #{o.id.slice(0, 8)}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(o.createdAt).toLocaleString()}
            </span>
          </div>
          <ul className="mt-2 space-y-0.5 text-sm">
            {o.items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>
                  {it.quantity}× {it.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatPrice(it.unitPriceCents * it.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-medium">
            <span>Total</span>
            <span className="tabular-nums">
              {formatPrice(
                o.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
              )}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
