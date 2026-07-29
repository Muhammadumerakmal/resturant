import { eq } from "drizzle-orm";
import { db } from "@repo/db";
import { users } from "@repo/db/schema";
import type { User } from "@repo/shared";

// Data access for customer accounts. Returns null when a row is absent (callers
// map that to 401/409). Never strips the password hash — controllers do that.

export async function findByEmail(email: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function findById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string | null;
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name,
      phone: input.phone ?? null,
    })
    .returning();
  return row;
}

// Profile edit from the Account page. Only provided fields change. Returns the
// updated row, or null if the id doesn't exist.
export async function updateUser(
  id: string,
  input: { name?: string; phone?: string; defaultAddress?: string },
): Promise<User | null> {
  const [row] = await db
    .update(users)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.defaultAddress !== undefined && {
        defaultAddress: input.defaultAddress,
      }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return row ?? null;
}

export async function updatePassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, id));
}
