import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  index,
  check,
} from "drizzle-orm/pg-core";

// Mirrors PRD §6.1. Editable via the owner admin UI (create/update/availability/
// archive); hard-delete is blocked when an item is referenced by past order_items.
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
  // Soft-delete: hidden from menus but retained so past orders' FKs stay valid.
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").notNull().default("received"), // received|preparing|ready|served
    source: text("source").notNull().default("agent"), // agent|manual
    // Fulfillment type. Delivery orders carry customer/destination fields and a
    // delivery lifecycle derived from status + dispatchedAt/deliveredAt.
    orderType: text("order_type").notNull().default("dine_in"), // dine_in|delivery|pickup
    sessionId: text("session_id"),
    // Delivery details (nullable; only set for `delivery` orders).
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    deliveryAddress: text("delivery_address"),
    destLat: doublePrecision("dest_lat"),
    destLng: doublePrecision("dest_lng"),
    etaMinutes: integer("eta_minutes"),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_orders_status").on(t.status),
    index("idx_orders_order_type").on(t.orderType),
    check(
      "orders_order_type_valid",
      sql`${t.orderType} in ('dine_in', 'delivery', 'pickup')`,
    ),
  ],
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
