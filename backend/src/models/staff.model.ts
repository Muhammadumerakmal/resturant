import { asc, eq } from "drizzle-orm";
import { db } from "@repo/db";
import { staffMembers } from "@repo/db/schema";
import type {
  CreateStaffInput,
  StaffMember,
  UpdateStaffInput,
} from "@repo/shared";

// Data access for the owner-managed staff roster. This is a directory record,
// not an auth system — staff routes stay gated by the shared STAFF_API_KEY.

export function listStaff() {
  return db.query.staffMembers.findMany({ orderBy: asc(staffMembers.name) });
}

export async function createStaff(
  input: CreateStaffInput,
): Promise<StaffMember> {
  const [row] = await db
    .insert(staffMembers)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      active: input.active ?? true,
    })
    .returning();
  return row;
}

export async function updateStaff(
  id: string,
  input: UpdateStaffInput,
): Promise<StaffMember | null> {
  const [row] = await db
    .update(staffMembers)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email.toLowerCase() }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.active !== undefined && { active: input.active }),
      updatedAt: new Date(),
    })
    .where(eq(staffMembers.id, id))
    .returning();
  return row ?? null;
}

export async function deleteStaff(id: string): Promise<StaffMember | null> {
  const [row] = await db
    .delete(staffMembers)
    .where(eq(staffMembers.id, id))
    .returning();
  return row ?? null;
}
