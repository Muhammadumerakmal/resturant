import type { Request, Response } from "express";
import { updateSettingsSchema } from "@repo/shared";
import * as settingsModel from "../models/settings.model";

// GET /api/v1/settings -> RestaurantSettings (public; used by the website)
export async function getSettings(_req: Request, res: Response) {
  const settings = await settingsModel.getSettings();
  res.json(settings);
}

// PATCH /api/v1/settings -> updated RestaurantSettings (staff)
export async function updateSettings(req: Request, res: Response) {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const updated = await settingsModel.updateSettings(parsed.data);
  res.json(updated);
}
