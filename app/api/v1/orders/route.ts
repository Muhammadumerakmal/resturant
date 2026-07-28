import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, menuItems } from "@/db/schema";
import { createOrderSchema } from "@/lib/validation";
import { OrderError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/orders?status=&limit=  -> Order[] (each with items), newest first
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;

  const rows = await db.query.orders.findMany({
    where: status ? eq(orders.status, status) : undefined,
    with: { items: true },
    orderBy: desc(orders.createdAt),
    limit,
  });
  return NextResponse.json(rows);
}

// POST /api/v1/orders  -> creates an order + items in a single transaction (PRD §8).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
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

      // Validate every referenced item exists and is available (PRD §10).
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
            name: byId.get(it.menu_item_id)!.name, // snapshot at order time
            unitPriceCents: byId.get(it.menu_item_id)!.priceCents, // price snapshot
            quantity: it.quantity,
            notes: it.notes ?? null,
          })),
        )
        .returning();

      return { ...order, items: insertedItems };
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /orders failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
