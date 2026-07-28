import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";

// Mirrors PRD §6.1. Menu is seeded manually for v1 (no admin UI).
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  category: text("category").notNull(), // 'starter' | 'main' | 'dessert' etc.
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`), // 'vegetarian', 'spicy', 'gluten-free'
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").notNull().default("received"), // received|preparing|ready|served
    source: text("source").notNull().default("agent"), // agent|manual
    sessionId: text("session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_orders_status").on(t.status)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id),
    // Denormalized snapshots at order time (PRD §6.2) — past orders survive menu
    // edits to both name and price.
    name: text("name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    notes: text("notes"),
  },
  (t) => [
    index("idx_order_items_order_id").on(t.orderId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

// Relations enable db.query.orders.findMany({ with: { items: true } }).
export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
