import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@repo/db";
import { orders, orderItems, menuItems } from "@repo/db/schema";
import { OrderError, type CreateOrderInput } from "@repo/shared";

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
  const { items, session_id, source } = input;

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
      .values({ source: source ?? "manual", sessionId: session_id ?? null })
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
export async function updateOrderStatus(id: string, status: string) {
  const [updated] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning({ id: orders.id });

  if (!updated) return null;
  return findOrderById(id);
}
