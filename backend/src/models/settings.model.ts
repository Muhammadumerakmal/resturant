import { eq } from "drizzle-orm";
import { db } from "@repo/db";
import { restaurantSettings } from "@repo/db/schema";
import type { RestaurantSettings, UpdateSettingsInput } from "@repo/shared";

// Single-row restaurant profile. getSettings creates a default row on first read
// so the API always returns something; updateSettings edits that row.

async function ensureRow(): Promise<RestaurantSettings> {
  const [existing] = await db.select().from(restaurantSettings).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(restaurantSettings)
    .values({ name: "Tavola" })
    .returning();
  return created;
}

export function getSettings(): Promise<RestaurantSettings> {
  return ensureRow();
}

export async function updateSettings(
  input: UpdateSettingsInput,
): Promise<RestaurantSettings> {
  const current = await ensureRow();
  const [updated] = await db
    .update(restaurantSettings)
    .set({
      // Only overwrite provided fields (all optional in the schema).
      name: input.name ?? current.name,
      tagline: input.tagline ?? current.tagline,
      phone: input.phone ?? current.phone,
      email: input.email ?? current.email,
      address: input.address ?? current.address,
      hours: input.hours ?? current.hours,
      staffKeyHint: input.staff_key_hint ?? current.staffKeyHint,
      updatedAt: new Date(),
    })
    .where(eq(restaurantSettings.id, current.id))
    .returning();
  return updated;
}
