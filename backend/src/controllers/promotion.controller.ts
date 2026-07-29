import type { Request, Response } from "express";
import { z } from "zod";
import {
  createPromotionSchema,
  updatePromotionSchema,
  validatePromotionSchema,
  type PromoType,
  type PromoValidation,
} from "@repo/shared";
import * as promotionModel from "../models/promotion.model";

const uuid = z.string().uuid();

// Postgres unique-violation (duplicate code) -> 409 rather than a 500.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

// GET /api/v1/promotions -> Promotion[] (staff)
export async function listPromotions(_req: Request, res: Response) {
  res.json(await promotionModel.listPromotions());
}

// POST /api/v1/promotions -> 201 Promotion (staff)
export async function createPromotion(req: Request, res: Response) {
  const parsed = createPromotionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const created = await promotionModel.createPromotion(parsed.data);
    res.status(201).json(created);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "A promotion with that code already exists" });
      return;
    }
    console.error("POST /promotions failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

// PATCH /api/v1/promotions/:id -> Promotion (staff)
export async function updatePromotion(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = updatePromotionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await promotionModel.updatePromotion(id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "A promotion with that code already exists" });
      return;
    }
    console.error("PATCH /promotions/:id failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

// DELETE /api/v1/promotions/:id -> Promotion (staff)
export async function removePromotion(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const deleted = await promotionModel.deletePromotion(id);
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(deleted);
}

// POST /api/v1/promotions/validate { code } -> PromoValidation (public)
export async function validatePromotion(req: Request, res: Response) {
  const parsed = validatePromotionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const promo = await promotionModel.findValid(parsed.data.code);
  const result: PromoValidation = promo
    ? {
        valid: true,
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType as PromoType,
        discountValue: promo.discountValue,
      }
    : { valid: false };
  res.json(result);
}
