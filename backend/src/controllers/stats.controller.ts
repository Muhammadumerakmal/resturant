import type { Request, Response } from "express";
import { statsQuerySchema } from "@repo/shared";
import * as statsModel from "../models/stats.model";

// GET /api/v1/analytics?from=&to=  -> aggregated owner analytics (staff)
export async function getAnalytics(req: Request, res: Response) {
  const parsed = statsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const range = parsed.data;

  const [summary, statusCounts, topItems, revenueOverTime] = await Promise.all([
    statsModel.getRevenueSummary(range),
    statsModel.getStatusCounts(range),
    statsModel.getTopItems(range),
    statsModel.getRevenueOverTime(range),
  ]);

  res.json({ summary, statusCounts, topItems, revenueOverTime });
}
