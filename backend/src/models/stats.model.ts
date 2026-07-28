import { sql } from "drizzle-orm";
import { db } from "@repo/db";
import { ORDER_STATUSES, type OrderStatus } from "@repo/shared";

// Analytics/aggregation queries. Revenue is computed from the DENORMALIZED
// order_items snapshots (unit_price_cents * quantity), so historical totals stay
// accurate even after menu prices change (PRD §6.2).

interface Range {
  from?: string;
  to?: string;
}

// Reusable "orders.created_at within range" predicate as raw SQL fragments.
function ordersRange(r: Range) {
  const parts = [] as ReturnType<typeof sql>[];
  if (r.from) parts.push(sql`o.created_at >= ${r.from}`);
  if (r.to) parts.push(sql`o.created_at <= ${r.to}`);
  if (parts.length === 0) return sql`true`;
  return sql.join(parts, sql` and `);
}

export interface RevenueSummary {
  revenueCents: number;
  orderCount: number;
  itemCount: number;
  avgOrderCents: number;
}

export async function getRevenueSummary(r: Range): Promise<RevenueSummary> {
  const res = await db.execute<{
    revenue_cents: string | null;
    order_count: string;
    item_count: string | null;
  }>(sql`
    select
      coalesce(sum(oi.unit_price_cents * oi.quantity), 0) as revenue_cents,
      count(distinct o.id) as order_count,
      coalesce(sum(oi.quantity), 0) as item_count
    from orders o
    left join order_items oi on oi.order_id = o.id
    where ${ordersRange(r)}
  `);
  const row = res.rows[0];
  const revenueCents = Number(row?.revenue_cents ?? 0);
  const orderCount = Number(row?.order_count ?? 0);
  return {
    revenueCents,
    orderCount,
    itemCount: Number(row?.item_count ?? 0),
    avgOrderCents: orderCount ? Math.round(revenueCents / orderCount) : 0,
  };
}

export async function getStatusCounts(
  r: Range,
): Promise<{ status: OrderStatus; count: number }[]> {
  const res = await db.execute<{ status: string; count: string }>(sql`
    select o.status, count(*) as count
    from orders o
    where ${ordersRange(r)}
    group by o.status
  `);
  const map = new Map(res.rows.map((row) => [row.status, Number(row.count)]));
  // Return all statuses in canonical order (zero-filled), ignore unknown values.
  return ORDER_STATUSES.map((status) => ({
    status,
    count: map.get(status) ?? 0,
  }));
}

export interface TopItem {
  name: string;
  quantity: number;
  revenueCents: number;
}

export async function getTopItems(r: Range, limit = 8): Promise<TopItem[]> {
  const res = await db.execute<{
    name: string;
    quantity: string;
    revenue_cents: string;
  }>(sql`
    select
      oi.name,
      sum(oi.quantity) as quantity,
      sum(oi.unit_price_cents * oi.quantity) as revenue_cents
    from order_items oi
    join orders o on o.id = oi.order_id
    where ${ordersRange(r)}
    group by oi.name
    order by quantity desc
    limit ${limit}
  `);
  return res.rows.map((row) => ({
    name: row.name,
    quantity: Number(row.quantity),
    revenueCents: Number(row.revenue_cents),
  }));
}

export interface RevenuePoint {
  date: string;
  revenueCents: number;
  orders: number;
}

export async function getRevenueOverTime(r: Range): Promise<RevenuePoint[]> {
  const res = await db.execute<{
    day: string;
    revenue_cents: string | null;
    orders: string;
  }>(sql`
    select
      date_trunc('day', o.created_at) as day,
      coalesce(sum(oi.unit_price_cents * oi.quantity), 0) as revenue_cents,
      count(distinct o.id) as orders
    from orders o
    left join order_items oi on oi.order_id = o.id
    where ${ordersRange(r)}
    group by day
    order by day asc
  `);
  return res.rows.map((row) => ({
    date: new Date(row.day).toISOString(),
    revenueCents: Number(row.revenue_cents ?? 0),
    orders: Number(row.orders),
  }));
}
