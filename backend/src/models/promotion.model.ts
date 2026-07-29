import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@repo/db";
import { promotions } from "@repo/db/schema";
import type {
  CreatePromotionInput,
  Promotion,
  UpdatePromotionInput,
} from "@repo/shared";

// Data access for discount codes. Codes are normalized to uppercase so lookups
// are case-insensitive against the unique constraint.

const normalize = (code: string) => code.trim().toUpperCase();

export function listPromotions() {
  return db.query.promotions.findMany({ orderBy: desc(promotions.createdAt) });
}

export async function createPromotion(
  input: CreatePromotionInput,
): Promise<Promotion> {
  const [row] = await db
    .insert(promotions)
    .values({
      code: normalize(input.code),
      description: input.description ?? null,
      discountType: input.discount_type,
      discountValue: input.discount_value,
      active: input.active ?? true,
      startsAt: input.starts_at ? new Date(input.starts_at) : null,
      endsAt: input.ends_at ? new Date(input.ends_at) : null,
    })
    .returning();
  return row;
}

export async function updatePromotion(
  id: string,
  input: UpdatePromotionInput,
): Promise<Promotion | null> {
  const [row] = await db
    .update(promotions)
    .set({
      ...(input.code !== undefined && { code: normalize(input.code) }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.discount_type !== undefined && {
        discountType: input.discount_type,
      }),
      ...(input.discount_value !== undefined && {
        discountValue: input.discount_value,
      }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.starts_at !== undefined && {
        startsAt: input.starts_at ? new Date(input.starts_at) : null,
      }),
      ...(input.ends_at !== undefined && {
        endsAt: input.ends_at ? new Date(input.ends_at) : null,
      }),
      updatedAt: new Date(),
    })
    .where(eq(promotions.id, id))
    .returning();
  return row ?? null;
}

export async function deletePromotion(id: string): Promise<Promotion | null> {
  const [row] = await db
    .delete(promotions)
    .where(eq(promotions.id, id))
    .returning();
  return row ?? null;
}

// Resolve a code to a currently-valid promotion: active, and within its date
// window (either bound may be open). Returns null when no valid code matches.
export async function findValid(code: string): Promise<Promotion | null> {
  const now = new Date();
  const [row] = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.code, normalize(code)),
        eq(promotions.active, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
      ),
    )
    .limit(1);
  return row ?? null;
}
