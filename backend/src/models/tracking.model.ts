import { eq } from "drizzle-orm";
import { db } from "@repo/db";
import { orders } from "@repo/db/schema";
import {
  DELIVERY_STAGES,
  DELIVERY_STAGE_LABELS,
  interpolateAlongRoute,
  OrderError,
  type DeliveryStage,
  type TrackingState,
} from "@repo/shared";

const DEFAULT_ETA_MINUTES = 20;

type OrderRow = typeof orders.$inferSelect;

// Derives the customer-facing delivery stage from the kitchen status plus the
// dispatch/delivery timestamps (we don't store a separate delivery status).
function deriveStage(o: OrderRow): DeliveryStage {
  if (o.deliveredAt) return "delivered";
  if (o.dispatchedAt) return "out_for_delivery";
  if (o.status === "preparing" || o.status === "ready") return "preparing";
  return "confirmed";
}

// 0..1 progress of the courier along the route. Before dispatch it's 0; once
// dispatched it advances with elapsed/eta but never reaches 1 until delivered.
function computeProgress(o: OrderRow, now: number): number {
  if (o.deliveredAt) return 1;
  if (!o.dispatchedAt) return 0;
  const eta = (o.etaMinutes ?? DEFAULT_ETA_MINUTES) * 60_000;
  const elapsed = now - new Date(o.dispatchedAt).getTime();
  if (eta <= 0) return 0.95;
  return Math.min(0.95, Math.max(0, elapsed / eta));
}

function etaRemaining(o: OrderRow, now: number): number | null {
  if (o.deliveredAt) return 0;
  if (!o.dispatchedAt) return o.etaMinutes ?? null;
  const total = o.etaMinutes ?? DEFAULT_ETA_MINUTES;
  const elapsedMin = (now - new Date(o.dispatchedAt).getTime()) / 60_000;
  return Math.max(0, Math.round(total - elapsedMin));
}

function buildTimeline(stage: DeliveryStage) {
  const currentIndex = DELIVERY_STAGES.indexOf(stage);
  return DELIVERY_STAGES.map((s, i) => ({
    stage: s,
    label: DELIVERY_STAGE_LABELS[s],
    done: i < currentIndex || stage === "delivered",
    active: i === currentIndex && stage !== "delivered",
  }));
}

export async function getTracking(id: string): Promise<TrackingState | null> {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!o) return null;

  const now = Date.now();
  const stage = deriveStage(o);
  const progress = computeProgress(o, now);

  return {
    orderId: o.id,
    orderType: o.orderType,
    stage,
    courierPos: interpolateAlongRoute(progress),
    progress,
    etaMinutes: etaRemaining(o, now),
    dispatchedAt: o.dispatchedAt ? new Date(o.dispatchedAt).toISOString() : null,
    deliveredAt: o.deliveredAt ? new Date(o.deliveredAt).toISOString() : null,
    address: o.deliveryAddress,
    customerName: o.customerName,
    timeline: buildTimeline(stage),
  };
}

// Marks a delivery order as dispatched (courier on the way). Only valid for
// delivery orders; throws OrderError otherwise (→ 409).
export async function dispatchOrder(id: string, etaMinutes?: number) {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!o) return null;
  if (o.orderType !== "delivery") {
    throw new OrderError("Only delivery orders can be dispatched");
  }
  const [updated] = await db
    .update(orders)
    .set({
      dispatchedAt: new Date(),
      etaMinutes: etaMinutes ?? o.etaMinutes ?? DEFAULT_ETA_MINUTES,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();
  return updated ?? null;
}

// Marks the order delivered and closes it out (status → served).
export async function markDelivered(id: string) {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!o) return null;
  if (o.orderType !== "delivery") {
    throw new OrderError("Only delivery orders can be marked delivered");
  }
  const [updated] = await db
    .update(orders)
    .set({ deliveredAt: new Date(), status: "served", updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();
  return updated ?? null;
}
