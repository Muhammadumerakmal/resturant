import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@repo/db";
import { orders } from "@repo/db/schema";
import type { CustomerSummary } from "@repo/shared";

// Customers are a READ MODEL over delivery orders (there's no customers table).
// Aggregated by customer_phone; revenue uses the denormalized order_items
// snapshots so it stays accurate across menu price changes (PRD §6.2).

export async function listCustomers(): Promise<CustomerSummary[]> {
  const res = await db.execute<{
    name: string | null;
    phone: string;
    order_count: string;
    total_spent_cents: string | null;
    last_order_at: string;
  }>(sql`
    select
      max(o.customer_name) as name,
      o.customer_phone as phone,
      count(distinct o.id) as order_count,
      coalesce(sum(oi.unit_price_cents * oi.quantity), 0) as total_spent_cents,
      max(o.created_at) as last_order_at
    from orders o
    left join order_items oi on oi.order_id = o.id
    where o.order_type = 'delivery' and o.customer_phone is not null
    group by o.customer_phone
    order by last_order_at desc
  `);
  return res.rows.map((row) => ({
    name: row.name,
    phone: row.phone,
    orderCount: Number(row.order_count),
    totalSpentCents: Number(row.total_spent_cents ?? 0),
    lastOrderAt: new Date(row.last_order_at).toISOString(),
  }));
}

// A single customer's order history (with items), newest first.
export function getCustomerOrders(phone: string) {
  return db.query.orders.findMany({
    where: and(eq(orders.customerPhone, phone), eq(orders.orderType, "delivery")),
    with: { items: true },
    orderBy: desc(orders.createdAt),
    limit: 100,
  });
}
