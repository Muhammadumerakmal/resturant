import { tool } from "@openai/agents";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@repo/db";

// READ-ONLY analytics tools for the owner assistant. They query the SAME
// denormalized order_items snapshots the owner dashboard uses (unit_price_cents
// * quantity), so revenue stays accurate even after menu prices change (PRD
// §6.2). The owner agent NEVER writes to the DB — it only reports.

// Optional ISO date bounds. Passed as nullable (not optional) so the generated
// JSON schema stays strict-mode friendly across OpenAI-compatible models.
const rangeParams = {
  from: z
    .string()
    .nullable()
    .describe("Start of range, ISO date/datetime, or null for last 30 days"),
  to: z
    .string()
    .nullable()
    .describe("End of range, ISO date/datetime, or null for now"),
};

// Default to the trailing 30 days when the caller gives no explicit bounds.
function resolveRange(from: string | null, to: string | null) {
  const now = new Date();
  const start =
    from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = to ?? now.toISOString();
  return { from: start, to: end };
}

function ordersRange(from: string, to: string) {
  return sql`o.created_at >= ${from} and o.created_at <= ${to}`;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const getSalesSummary = tool({
  name: "get_sales_summary",
  description:
    "Headline sales for a date range: total revenue, order count, items sold, and average order value. Use this for questions about how much money was made / how business is doing.",
  parameters: z.object(rangeParams),
  execute: async ({ from, to }) => {
    const r = resolveRange(from, to);
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
      where ${ordersRange(r.from, r.to)}
    `);
    const row = res.rows[0];
    const revenueCents = Number(row?.revenue_cents ?? 0);
    const orderCount = Number(row?.order_count ?? 0);
    return {
      range: r,
      revenue: money(revenueCents),
      revenue_cents: revenueCents,
      orders: orderCount,
      items_sold: Number(row?.item_count ?? 0),
      average_order: money(orderCount ? Math.round(revenueCents / orderCount) : 0),
    };
  },
});

export const getTopItems = tool({
  name: "get_top_items",
  description:
    "Best-selling menu items in a date range, ranked by quantity sold, with the revenue each generated. Use for 'what sells best', 'top dishes', menu performance.",
  parameters: z.object({
    ...rangeParams,
    limit: z
      .number()
      .int()
      .positive()
      .max(25)
      .nullable()
      .describe("How many items to return (default 8)"),
  }),
  execute: async ({ from, to, limit }) => {
    const r = resolveRange(from, to);
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
      where ${ordersRange(r.from, r.to)}
      group by oi.name
      order by quantity desc
      limit ${limit ?? 8}
    `);
    return {
      range: r,
      items: res.rows.map((row) => ({
        name: row.name,
        quantity: Number(row.quantity),
        revenue: money(Number(row.revenue_cents)),
      })),
    };
  },
});

export const getRevenueOverTime = tool({
  name: "get_revenue_over_time",
  description:
    "Daily revenue and order counts across a date range, oldest to newest. Use for trends, growth, 'how did each day do', busy vs slow days.",
  parameters: z.object(rangeParams),
  execute: async ({ from, to }) => {
    const r = resolveRange(from, to);
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
      where ${ordersRange(r.from, r.to)}
      group by day
      order by day asc
    `);
    return {
      range: r,
      days: res.rows.map((row) => ({
        date: new Date(row.day).toISOString().slice(0, 10),
        revenue: money(Number(row.revenue_cents ?? 0)),
        orders: Number(row.orders),
      })),
    };
  },
});

export const getOrderBreakdown = tool({
  name: "get_order_breakdown",
  description:
    "Order counts split by kitchen status (received/preparing/ready/served) and by fulfillment type (dine_in/delivery/pickup) for a date range. Use for operational questions about the order pipeline.",
  parameters: z.object(rangeParams),
  execute: async ({ from, to }) => {
    const r = resolveRange(from, to);
    const [byStatus, byType] = await Promise.all([
      db.execute<{ status: string; count: string }>(sql`
        select o.status, count(*) as count
        from orders o
        where ${ordersRange(r.from, r.to)}
        group by o.status
      `),
      db.execute<{ order_type: string; count: string }>(sql`
        select o.order_type, count(*) as count
        from orders o
        where ${ordersRange(r.from, r.to)}
        group by o.order_type
      `),
    ]);
    return {
      range: r,
      by_status: byStatus.rows.map((row) => ({
        status: row.status,
        count: Number(row.count),
      })),
      by_type: byType.rows.map((row) => ({
        type: row.order_type,
        count: Number(row.count),
      })),
    };
  },
});

export const getInventoryAlerts = tool({
  name: "get_inventory_alerts",
  description:
    "Current inventory/menu risks — items that are out of stock, low on stock (<= 3 tracked), or hidden/unavailable/archived. This is the closest thing to 'losses': sales you can't make because an item can't be sold right now.",
  parameters: z.object({}),
  execute: async () => {
    const res = await db.execute<{
      name: string;
      available: boolean;
      archived: boolean;
      stock_quantity: number | null;
    }>(sql`
      select name, available, archived, stock_quantity
      from menu_items
      where archived = true
         or available = false
         or (stock_quantity is not null and stock_quantity <= 3)
      order by
        (stock_quantity is not null and stock_quantity = 0) desc,
        stock_quantity asc nulls last,
        name asc
    `);
    const items = res.rows.map((row) => {
      const stock = row.stock_quantity;
      let state: string;
      if (row.archived) state = "archived";
      else if (stock === 0) state = "out_of_stock";
      else if (!row.available) state = "unavailable";
      else state = "low_stock";
      return {
        name: row.name,
        state,
        stock_left: stock,
      };
    });
    return { count: items.length, items };
  },
});

export const getReservationSummary = tool({
  name: "get_reservation_summary",
  description:
    "Table reservations booked within a date range, counted by status (pending/confirmed/seated/cancelled). Cancelled bookings are lost covers. Use for reservation/booking questions.",
  parameters: z.object(rangeParams),
  execute: async ({ from, to }) => {
    const r = resolveRange(from, to);
    const res = await db.execute<{
      status: string;
      count: string;
      covers: string | null;
    }>(sql`
      select status, count(*) as count, coalesce(sum(party_size), 0) as covers
      from reservations
      where created_at >= ${r.from} and created_at <= ${r.to}
      group by status
    `);
    return {
      range: r,
      by_status: res.rows.map((row) => ({
        status: row.status,
        count: Number(row.count),
        covers: Number(row.covers ?? 0),
      })),
    };
  },
});

export const ownerTools = [
  getSalesSummary,
  getTopItems,
  getRevenueOverTime,
  getOrderBreakdown,
  getInventoryAlerts,
  getReservationSummary,
];
