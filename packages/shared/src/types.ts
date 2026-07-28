import type { InferSelectModel } from "drizzle-orm";
import type { menuItems, orders, orderItems } from "@repo/db/schema";

export type MenuItem = InferSelectModel<typeof menuItems>;
export type Order = InferSelectModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;
export type OrderWithItems = Order & { items: OrderItem[] };

export const ORDER_STATUSES = ["received", "preparing", "ready", "served"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Which status a kitchen "advance" button moves an order to. `served` is terminal.
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  received: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
};

// Fulfillment type. `delivery` orders carry customer + destination details and
// surface the delivery tracking flow ("where's my food").
export const ORDER_TYPES = ["dine_in", "delivery", "pickup"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

// Customer-facing delivery lifecycle, derived from an order's kitchen `status`
// plus its dispatchedAt/deliveredAt timestamps (see @repo/shared/tracking).
export const DELIVERY_STAGES = [
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
] as const;
export type DeliveryStage = (typeof DELIVERY_STAGES)[number];
