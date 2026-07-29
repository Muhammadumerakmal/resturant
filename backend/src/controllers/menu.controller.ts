import type { Request, Response } from "express";
import { z } from "zod";
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  setAvailabilitySchema,
  setStockSchema,
  OrderError,
} from "@repo/shared";
import * as menuModel from "../models/menu.model";

const uuid = z.string().uuid();

// GET /api/v1/menu[?includeArchived=1] -> MenuItem[] (public; archived only with staff)
export async function getMenu(req: Request, res: Response) {
  const includeArchived = req.query.includeArchived === "1";
  const items = await menuModel.listMenu({ includeArchived });
  res.json(items);
}

// GET /api/v1/menu/:id -> MenuItem (public; 404 for missing or archived)
export async function getItem(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const item = await menuModel.getPublicMenuItem(id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(item);
}

// POST /api/v1/menu -> 201 MenuItem (staff)
export async function createItem(req: Request, res: Response) {
  const parsed = createMenuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const item = await menuModel.createMenuItem(parsed.data);
  res.status(201).json(item);
}

// PATCH /api/v1/menu/:id -> MenuItem (staff)
export async function updateItem(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = updateMenuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const item = await menuModel.updateMenuItem(id, parsed.data);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(item);
}

// PATCH /api/v1/menu/:id/availability { available } -> MenuItem (staff)
export async function toggleAvailability(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = setAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const item = await menuModel.setAvailability(id, parsed.data.available);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(item);
}

// PATCH /api/v1/menu/:id/stock { stock_quantity } -> MenuItem (staff)
export async function setStock(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = setStockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const item = await menuModel.setStock(id, parsed.data.stock_quantity);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(item);
}

// DELETE /api/v1/menu/:id[?hard=1] -> MenuItem (staff)
// Defaults to soft-delete (archive). hard=1 permanently deletes, but only when the
// item isn't referenced by past orders (else 409).
export async function removeItem(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const hard = req.query.hard === "1";
  try {
    const item = hard
      ? await menuModel.hardDeleteMenuItem(id)
      : await menuModel.softDeleteMenuItem(id);
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    if (err instanceof OrderError) {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error("DELETE /menu/:id failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
}
