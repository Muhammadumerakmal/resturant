import { Router } from "express";
import { asc } from "drizzle-orm";
import { db } from "@repo/db";
import { menuItems } from "@repo/db/schema";

export const menuRouter = Router();

// GET /api/v1/menu -> MenuItem[]
menuRouter.get("/", async (_req, res) => {
  const items = await db
    .select()
    .from(menuItems)
    .orderBy(asc(menuItems.category), asc(menuItems.name));
  res.json(items);
});
