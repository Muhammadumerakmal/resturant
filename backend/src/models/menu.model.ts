import { asc } from "drizzle-orm";
import { db } from "@repo/db";
import { menuItems } from "@repo/db/schema";

// Model layer: all menu data access lives here. Controllers never touch the DB
// directly — they call these functions.

export function listMenu() {
  return db
    .select()
    .from(menuItems)
    .orderBy(asc(menuItems.category), asc(menuItems.name));
}
