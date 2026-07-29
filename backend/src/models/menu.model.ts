import { and, asc, eq } from "drizzle-orm";
import { db } from "@repo/db";
import { menuItems, orderItems } from "@repo/db/schema";
import {
  OrderError,
  type CreateMenuItemInput,
  type UpdateMenuItemInput,
} from "@repo/shared";

// Model layer: all menu data access lives here. Controllers never touch the DB
// directly — they call these functions.

// Public menus hide archived items; the owner admin passes includeArchived.
export function listMenu(opts?: { includeArchived?: boolean }) {
  const base = db.select().from(menuItems);
  const query = opts?.includeArchived
    ? base
    : base.where(eq(menuItems.archived, false));
  return query.orderBy(asc(menuItems.category), asc(menuItems.name));
}

export function findMenuItem(id: string) {
  return db.query.menuItems.findFirst({ where: eq(menuItems.id, id) });
}

// Public single-item lookup for the menu detail page: excludes archived items
// (they've been removed from the menu). Returns null when missing or archived.
export async function getPublicMenuItem(id: string) {
  const item = await db.query.menuItems.findFirst({
    where: and(eq(menuItems.id, id), eq(menuItems.archived, false)),
  });
  return item ?? null;
}

export async function createMenuItem(input: CreateMenuItemInput) {
  const [item] = await db
    .insert(menuItems)
    .values({
      name: input.name,
      description: input.description ?? null,
      priceCents: input.price_cents,
      category: input.category,
      tags: input.tags ?? [],
      available: input.available ?? true,
    })
    .returning();
  return item;
}

export async function updateMenuItem(id: string, input: UpdateMenuItemInput) {
  const [item] = await db
    .update(menuItems)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price_cents !== undefined && { priceCents: input.price_cents }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.available !== undefined && { available: input.available }),
      updatedAt: new Date(),
    })
    .where(eq(menuItems.id, id))
    .returning();
  return item ?? null;
}

export async function setAvailability(id: string, available: boolean) {
  const [item] = await db
    .update(menuItems)
    .set({ available, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning();
  return item ?? null;
}

// Soft-delete: keep the row (past order_items still reference it) but hide + mark
// unavailable. This is the default "delete" for the admin UI.
export async function softDeleteMenuItem(id: string) {
  const [item] = await db
    .update(menuItems)
    .set({ archived: true, available: false, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning();
  return item ?? null;
}

// Hard-delete: only allowed when no order_items reference the item, otherwise the
// FK (no cascade) would reject it — we surface a clean OrderError (→ 409) instead.
export async function hardDeleteMenuItem(id: string) {
  const referenced = await db.query.orderItems.findFirst({
    where: eq(orderItems.menuItemId, id),
  });
  if (referenced) {
    throw new OrderError(
      "Item appears in past orders and can't be permanently deleted — archive it instead",
    );
  }
  const [item] = await db
    .delete(menuItems)
    .where(eq(menuItems.id, id))
    .returning();
  return item ?? null;
}
