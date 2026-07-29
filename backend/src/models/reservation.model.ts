import { asc, eq } from "drizzle-orm";
import { db } from "@repo/db";
import { reservations } from "@repo/db/schema";
import type {
  CreateReservationInput,
  Reservation,
  ReservationStatus,
} from "@repo/shared";

// Data access for table bookings. Public creates; staff list + update status.

export async function createReservation(
  input: CreateReservationInput,
): Promise<Reservation> {
  const [row] = await db
    .insert(reservations)
    .values({
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      partySize: input.party_size,
      requestedAt: new Date(input.requested_at),
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export function listReservations(opts: { status?: string; limit: number }) {
  return db.query.reservations.findMany({
    where: opts.status ? eq(reservations.status, opts.status) : undefined,
    orderBy: asc(reservations.requestedAt),
    limit: opts.limit,
  });
}

// Returns the updated row, or null if the id doesn't exist.
export async function updateStatus(
  id: string,
  status: ReservationStatus,
): Promise<Reservation | null> {
  const [row] = await db
    .update(reservations)
    .set({ status })
    .where(eq(reservations.id, id))
    .returning();
  return row ?? null;
}
