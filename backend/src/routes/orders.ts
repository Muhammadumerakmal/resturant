import { Router } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/db";
import { orders, orderItems, menuItems } from "@repo/db/schema";
import { createOrderSchema, patchStatusSchema, OrderError } from "@repo/shared";

export const ordersRouter = Router();

const uuid = z.string().uuid();

// GET /api/v1/orders?status=&limit=  -> Order[] (with items), newest first
ordersRouter.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50;

  const rows = await db.query.orders.findMany({
    where: status ? eq(orders.status, status) : undefined,
    with: { items: true },
    orderBy: desc(orders.createdAt),
    limit,
  });
  res.json(rows);
});

// POST /api/v1/orders  -> creates order + items in a single transaction (PRD §8)
ordersRouter.post("/", async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { items, session_id, source } = parsed.data;

  try {
    const created = await db.transaction(async (tx) => {
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

    res.status(201).json(created);
  } catch (err) {
    if (err instanceof OrderError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("POST /orders failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/v1/orders/:id -> Order (with items)
ordersRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(order);
});

// PATCH /api/v1/orders/:id/status  { status } -> updated Order (with items)
ordersRouter.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = patchStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const [updated] = await db
    .update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning({ id: orders.id });

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const full = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
  res.json(full);
});
