import type { Request, Response } from "express";
import * as menuModel from "../models/menu.model";

// GET /api/v1/menu -> MenuItem[]
export async function getMenu(_req: Request, res: Response) {
  const items = await menuModel.listMenu();
  res.json(items);
}
