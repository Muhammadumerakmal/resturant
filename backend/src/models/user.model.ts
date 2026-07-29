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
