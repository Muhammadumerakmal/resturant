import { desc, eq } from "drizzle-orm";
import { db } from "@repo/db";
import { reviews } from "@repo/db/schema";
import type { CreateReviewInput, Review, ReviewStatus } from "@repo/shared";

// Data access for customer reviews. Public creates land as `pending`; staff
// moderate to `published`/`hidden`. The public site only ever shows published.

export async function createReview(
  input: CreateReviewInput,
  userId: string | null = null,
): Promise<Review> {
  const [row] = await db
    .insert(reviews)
    .values({
      userId,
      orderId: input.order_id ?? null,
      name: input.name,
      rating: input.rating,
      comment: input.comment ?? null,
    })
    .returning();
  return row;
}

// Public list: published reviews only, newest first.
export function listPublished() {
  return db.query.reviews.findMany({
    where: eq(reviews.status, "published"),
    orderBy: desc(reviews.createdAt),
    limit: 100,
  });
}

// Staff moderation list: all reviews, or a single status when filtered.
export function listForModeration(status?: string) {
  return db.query.reviews.findMany({
    where: status ? eq(reviews.status, status) : undefined,
    orderBy: desc(reviews.createdAt),
    limit: 200,
  });
}

export async function updateStatus(
  id: string,
  status: ReviewStatus,
): Promise<Review | null> {
  const [row] = await db
    .update(reviews)
    .set({ status })
    .where(eq(reviews.id, id))
    .returning();
  return row ?? null;
}
