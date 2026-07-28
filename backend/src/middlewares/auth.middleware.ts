import type { RequestHandler } from "express";
import { env } from "../config/env";

// Staff auth (PRD §9): kitchen/owner routes require a shared API key; the
// customer chat, menu, and order placement stay open. If STAFF_API_KEY is
// unset, auth is disabled (dev convenience).

// Header-based (x-staff-key) — used by fetch() calls.
export const requireStaff: RequestHandler = (req, res, next) => {
  const key = env.staffApiKey;
  if (!key || req.header("x-staff-key") === key) return next();
  res.status(401).json({ error: "Unauthorized — staff key required" });
};

// Query-param based (?key=) — EventSource can't send custom headers, so the
// SSE stream authenticates via the URL instead.
export const requireStaffQuery: RequestHandler = (req, res, next) => {
  const key = env.staffApiKey;
  if (!key || req.query.key === key) return next();
  res.status(401).json({ error: "Unauthorized — staff key required" });
};
