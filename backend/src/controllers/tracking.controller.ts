import type { Request, Response } from "express";
import { z } from "zod";
import { dispatchSchema, OrderError } from "@repo/shared";
import * as trackingModel from "../models/tracking.model";

const uuid = z.string().uuid();

// GET /api/v1/orders/:id/tracking -> TrackingState (public — customers track their own order)
export async function getTracking(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const state = await trackingModel.getTracking(id);
  if (!state) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(state);
}

// POST /api/v1/orders/:id/dispatch { eta_minutes? } -> Order (staff)
export async function dispatch(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = dispatchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const order = await trackingModel.dispatchOrder(id, parsed.data.eta_minutes);
    if (!order) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(order);
  } catch (err) {
    if (err instanceof OrderError) {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error("POST /orders/:id/dispatch failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

// POST /api/v1/orders/:id/delivered -> Order (staff)
export async function markDelivered(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const order = await trackingModel.markDelivered(id);
    if (!order) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(order);
  } catch (err) {
    if (err instanceof OrderError) {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error("POST /orders/:id/delivered failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
}
