import type { Request, Response } from "express";
import { z } from "zod";
import { createReviewSchema, updateReviewStatusSchema } from "@repo/shared";
import * as reviewModel from "../models/review.model";

const uuid = z.string().uuid();

// POST /api/v1/reviews -> 201 Review (public; soft-attached customer)
export async function createReview(req: Request, res: Response) {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const created = await reviewModel.createReview(parsed.data, req.userId ?? null);
  res.status(201).json(created);
}

// GET /api/v1/reviews -> published Review[] (public)
export async function listPublished(_req: Request, res: Response) {
  res.json(await reviewModel.listPublished());
}

// GET /api/v1/reviews/moderation?status= -> Review[] (staff)
export async function listForModeration(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  res.json(await reviewModel.listForModeration(status));
}

// PATCH /api/v1/reviews/:id/status { status } -> Review (staff)
export async function updateReviewStatus(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = updateReviewStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const updated = await reviewModel.updateStatus(id, parsed.data.status);
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
}
