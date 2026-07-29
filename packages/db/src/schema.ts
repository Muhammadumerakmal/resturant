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

// Customer accounts (best-practice auth: hashed passwords, never plaintext).
// Distinct from the staff API key, which stays a shared env secret.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    // Optional; lets us also match legacy phone-based delivery orders to a user.
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_users_email").on(t.email)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").notNull().default("received"), // received|preparing|ready|served
    source: text("source").notNull().default("agent"), // agent|manual
    // Set when a logged-in customer places the order, so their history is
    // authoritative (nullable: guest / agent / manual orders have none).
    userId: uuid("user_id").references(() => users.id),
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

// Table bookings submitted from the public site; staff review + set status.
export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    partySize: integer("party_size").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"), // pending|confirmed|seated|cancelled
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_reservations_requested_at").on(t.requestedAt),
    check("reservations_party_positive", sql`${t.partySize} > 0`),
    check(
      "reservations_status_valid",
      sql`${t.status} in ('pending', 'confirmed', 'seated', 'cancelled')`,
    ),
  ],
);

// Single-row restaurant profile shown on the public site + edited in owner
// settings. The model layer always reads/writes the first row.
export const restaurantSettings = pgTable("restaurant_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  hours: text("hours"),
  // A non-sensitive reminder only — the real staff key is an env secret.
  staffKeyHint: text("staff_key_hint"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
