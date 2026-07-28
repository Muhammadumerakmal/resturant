import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@repo/db";
import { orders, orderItems, menuItems } from "@repo/db/schema";
import {
  OrderError,
  NEXT_STATUS,
  type CreateOrderInput,
  type OrderStatus,
} from "@repo/shared";

// Model layer: all order data access lives here. Business rules that are really
// about data integrity (menu items exist, are available, single-transaction
// writes) live with the data too. Controllers orchestrate; models persist.

export function listOrders(opts: { status?: string; limit: number }) {
  return db.query.orders.findMany({
    where: opts.status ? eq(orders.status, opts.status) : undefined,
    with: { items: true },
    orderBy: desc(orders.createdAt),
    limit: opts.limit,
  });
}

export function findOrderById(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
}

// Creates the order and its items in a single transaction (PRD §8) — no partial
// orders. Throws OrderError for invalid/unavailable items so the controller can
// map it to a 400.
export function createOrder(input: CreateOrderInput) {
  const { items, session_id, source, order_type } = input;
  const isDelivery = order_type === "delivery";

  return db.transaction(async (tx) => {
    const ids = [...new Set(items.map((i) => i.menu_item_id))];
    const menuRows = await tx
      .select()
      .from(menuItems)
      .where(inArray(menuItems.id, ids));
    const byId = new Map(menuRows.map((m) => [m.id, m]));

    for (const it of items) {
      const m = byId.get(it.menu_item_id);
      if (!m) throw new OrderError(`Menu item not found: ${it.menu_item_id}`);
      if (!m.available) throw new OrderError(`Item is unavailable: ${m.name}`);
    }

    const [order] = await tx
      .insert(orders)
      .values({
        source: source ?? "manual",
        sessionId: session_id ?? null,
        orderType: order_type ?? "dine_in",
        // Delivery details only apply to delivery orders (validated upstream).
        customerName: isDelivery ? (input.customer_name ?? null) : null,
        customerPhone: isDelivery ? (input.customer_phone ?? null) : null,
        deliveryAddress: isDelivery ? (input.address ?? null) : null,
        destLat: isDelivery ? (input.dest_lat ?? null) : null,
        destLng: isDelivery ? (input.dest_lng ?? null) : null,
      })
      .returning();

    const insertedItems = await tx
      .insert(orderItems)
      .values(
        items.map((it) => ({
          orderId: order.id,
          menuItemId: it.menu_item_id,
          name: byId.get(it.menu_item_id)!.name,
          unitPriceCents: byId.get(it.menu_item_id)!.priceCents,
          quantity: it.quantity,
          notes: it.notes ?? null,
        })),
      )
      .returning();

    return { ...order, items: insertedItems };
  });
}

// Updates status and returns the full order (with items), or null if not found.
// Enforces the kitchen state machine (received→preparing→ready→served): only the
// single legal next step is accepted, so the queue can't skip or move backwards.
// Throws OrderError (→ 409) on an illegal transition.
export async function updateOrderStatus(id: string, status: OrderStatus) {
  const current = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    columns: { status: true },
  });
  if (!current) return null;

  const from = current.status as OrderStatus;
  if (status !== from && NEXT_STATUS[from] !== status) {
    throw new OrderError(
      `Can't move order from "${from}" to "${status}"`,
    );
  }

  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id));

  return findOrderById(id);
}
