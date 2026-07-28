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
