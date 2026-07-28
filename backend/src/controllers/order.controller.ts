import type { Request, Response } from "express";
import { z } from "zod";
import { createOrderSchema, patchStatusSchema, OrderError } from "@repo/shared";
import * as orderModel from "../models/order.model";

const uuid = z.string().uuid();

// GET /api/v1/orders?status=&limit=  -> Order[] (with items), newest first (staff)
export async function listOrders(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50;

  const rows = await orderModel.listOrders({ status, limit });
  res.json(rows);
}

// POST /api/v1/orders  -> creates order + items in a single transaction (PRD §8)
export async function createOrder(req: Request, res: Response) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const created = await orderModel.createOrder(parsed.data);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof OrderError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("POST /orders failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

// GET /api/v1/orders/:id -> Order (with items) (staff)
export async function getOrder(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const order = await orderModel.findOrderById(id);
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(order);
}

// PATCH /api/v1/orders/:id/status  { status } -> updated Order (with items) (staff)
export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = patchStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const full = await orderModel.updateOrderStatus(id, parsed.data.status);
  if (!full) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(full);
}
