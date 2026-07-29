import type { RequestHandler } from "express";
import { env } from "../config/env";
import { verifyToken } from "../services/auth.service";

// Customer auth: a JWT in an httpOnly cookie identifies a logged-in customer.
// Distinct from the staff API key (see auth.middleware.ts).

// Attaches req.userId if a valid auth cookie is present, but never blocks —
// use on endpoints that behave differently when signed in.
export const attachCustomer: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[env.authCookieName];
  if (token) {
    const userId = await verifyToken(token);
    if (userId) req.userId = userId;
  }
  next();
};

// Requires a logged-in customer; 401 otherwise.
export const requireCustomer: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[env.authCookieName];
  const userId = token ? await verifyToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  req.userId = userId;
  next();
};
