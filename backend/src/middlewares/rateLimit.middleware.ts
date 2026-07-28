import type { RequestHandler } from "express";

// Light global rate limit (PRD §9): per-IP sliding window. The agent route has
// its own tighter per-session limit on top of this.
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export const rateLimit: RequestHandler = (req, res, next) => {
  // SSE is a single long-lived connection; don't count it against the window.
  if (req.path.endsWith("/stream")) return next();
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (recent.length > RATE_LIMIT) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  next();
};
