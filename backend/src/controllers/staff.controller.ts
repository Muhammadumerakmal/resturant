import type { Request, Response } from "express";
import { z } from "zod";
import { createStaffSchema, updateStaffSchema } from "@repo/shared";
import * as staffModel from "../models/staff.model";

const uuid = z.string().uuid();

// Postgres unique-violation (duplicate email) -> 409 rather than a 500.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

// GET /api/v1/staff -> StaffMember[] (staff)
export async function listStaff(_req: Request, res: Response) {
  res.json(await staffModel.listStaff());
}

// POST /api/v1/staff -> 201 StaffMember (staff)
export async function createStaff(req: Request, res: Response) {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const created = await staffModel.createStaff(parsed.data);
    res.status(201).json(created);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "A staff member with that email already exists" });
      return;
    }
    console.error("POST /staff failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

// PATCH /api/v1/staff/:id -> StaffMember (staff)
export async function updateStaff(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await staffModel.updateStaff(id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "A staff member with that email already exists" });
      return;
    }
    console.error("PATCH /staff/:id failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

// DELETE /api/v1/staff/:id -> StaffMember (staff)
export async function removeStaff(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const deleted = await staffModel.deleteStaff(id);
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(deleted);
}
