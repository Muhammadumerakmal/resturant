"use client";

import { useState } from "react";
import { Bike, Clock, MapPin, PartyPopper } from "lucide-react";
import { formatPrice, type OrderWithItems } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOrders } from "@/lib/useOrders";
import { useTracking } from "@/lib/useTracking";
import { useOwner, LivePill } from "../OwnerShell";
import { Badge } from "@/app/_components/ui/Badge";
import { Button } from "@/app/_components/ui/Button";
import { Card } from "@/app/_components/ui/Card";
import { DeliveryMap } from "@/app/_components/DeliveryMap";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { Input } from "@/app/_components/ui/Input";
import { Modal } from "@/app/_components/ui/Modal";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/app/_components/ui/Table";
import { Timeline } from "@/app/_components/ui/Timeline";
import { useToast } from "@/app/_components/ui/Toast";

// Delivery stage derived from the order's timestamps + kitchen status. Mirrors
// the customer tracking lifecycle without needing the tracking endpoint.
function stageBadge(o: OrderWithItems) {
  if (o.deliveredAt) return <Badge tone="success">Delivered</Badge>;
  if (o.dispatchedAt) return <Badge tone="info">Out for delivery</Badge>;
  if (o.status === "ready") return <Badge tone="warning">Ready to dispatch</Badge>;
  return <Badge>Preparing</Badge>;
}

export default function OwnerDeliveriesPage() {
  const { staffKey } = useOwner();
  const { orders, loaded, live, refresh } = useOrders({ staffKey, intervalMs: 3000 });
  const [selected, setSelected] = useState<OrderWithItems | null>(null);

  const deliveries = orders.filter((o) => o.orderType === "delivery");

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Deliveries"
        subtitle="Dispatch delivery orders and follow the courier live"
        icon={<Bike className="h-5 w-5" />}
        actions={<LivePill live={live} />}
      />

      <div className="mt-6">
        {!loaded ? (
          <Skeleton className="h-64 w-full" />
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon={<Bike className="h-6 w-6" />}
            title="No delivery orders"
            description="Delivery orders placed by customers will appear here."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Address</TH>
                <TH>Stage</TH>
                <TH className="text-right">Total</TH>
                <TH>Placed</TH>
              </tr>
            </THead>
            <tbody>
              {deliveries.map((o) => (
                <TR key={o.id} onClick={() => setSelected(o)}>
                  <TD className="font-mono text-muted-foreground">#{o.id.slice(0, 8)}</TD>
                  <TD>
                    <div className="font-medium">{o.customerName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.customerPhone}</div>
                  </TD>
                  <TD className="max-w-[16rem] truncate text-muted-foreground">
                    {o.deliveryAddress ?? "—"}
                  </TD>
                  <TD>{stageBadge(o)}</TD>
                  <TD className="text-right tabular-nums">
                    {formatPrice(o.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0))}
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

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Delivery #${selected.id.slice(0, 8)}` : ""}
      >
        {selected && (
          <DeliveryDetail
            order={selected}
            staffKey={staffKey}
            onChanged={() => {
              refresh();
              setSelected(null);
            }}
          />
        )}
      </Modal>
    </main>
  );
}

function DeliveryDetail({
  order,
  staffKey,
  onChanged,
}: {
  order: OrderWithItems;
  staffKey: string;
  onChanged: () => void;
}) {
  const { state, loaded } = useTracking(order.id);
  const toast = useToast();
  const [eta, setEta] = useState("30");
  const [busy, setBusy] = useState(false);

  async function dispatch() {
    const eta_minutes = Number(eta);
    setBusy(true);
    try {
      await apiFetch(`/api/v1/orders/${order.id}/dispatch`, {
        method: "POST",
        body: Number.isFinite(eta_minutes) && eta_minutes > 0 ? { eta_minutes } : {},
        staffKey,
      });
      toast("Order dispatched", "success");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Dispatch failed", "warning");
      setBusy(false);
    }
  }

  async function markDelivered() {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/orders/${order.id}/delivered`, {
        method: "POST",
        staffKey,
      });
      toast("Marked delivered", "success");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "warning");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="font-medium">{order.customerName}</span> ·{" "}
            {order.customerPhone}
            <br />
            {order.deliveryAddress}
          </span>
        </div>
      </div>

      {!loaded ? (
        <Skeleton className="h-64 w-full" />
      ) : state && state.orderType === "delivery" ? (
        <>
          <Card className="flex items-center justify-between p-4">
            {state.stage === "delivered" ? (
              <div className="flex items-center gap-2 font-semibold text-success">
                <PartyPopper className="h-5 w-5" /> Delivered
              </div>
            ) : (
              <>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {state.stage === "out_for_delivery" ? "Arriving in" : "Estimated wait"}
                  </div>
                  <div className="mt-0.5 text-xl font-bold">
                    {state.etaMinutes !== null ? `${state.etaMinutes} min` : "—"}
                  </div>
                </div>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </>
            )}
          </Card>
          <DeliveryMap courierPos={state.courierPos} progress={state.progress} />
          <Card className="p-4">
            <Timeline
              steps={state.timeline.map((s) => ({
                label: s.label,
                done: s.done,
                active: s.active,
              }))}
            />
          </Card>
        </>
      ) : null}

      {/* Actions depend on the delivery lifecycle. */}
      {!order.deliveredAt && (
        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          {!order.dispatchedAt ? (
            <>
              <div className="mr-auto flex items-center gap-2">
                <label className="text-xs text-muted-foreground">ETA (min)</label>
                <Input
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  inputMode="numeric"
                  className="h-9 w-20"
                />
              </div>
              <Button onClick={dispatch} disabled={busy}>
                <Bike className="h-4 w-4" />
                {busy ? "Dispatching…" : "Dispatch"}
              </Button>
            </>
          ) : (
            <Button onClick={markDelivered} disabled={busy}>
              {busy ? "Saving…" : "Mark delivered"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
