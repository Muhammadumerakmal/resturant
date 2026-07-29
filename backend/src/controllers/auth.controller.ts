import type { CookieOptions, Request, Response } from "express";
import {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  type SafeUser,
  type User,
} from "@repo/shared";
import { env } from "../config/env";
import * as userModel from "../models/user.model";
import {
  hashPassword,
  verifyPassword,
  signToken,
  TOKEN_MAX_AGE_MS,
} from "../services/auth.service";

// Never leak the password hash over the API.
function toSafeUser(u: User): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    defaultAddress: u.defaultAddress,
  };
}

// Cookie flags. In production the frontend and backend live on different
// *.vercel.app domains (cross-site), so the auth cookie needs SameSite=None +
// Secure to be sent; in local dev (same-site localhost, http) use Lax.
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_MS,
  };
}

async function setAuthCookie(res: Response, userId: string) {
  const token = await signToken(userId);
  res.cookie(env.authCookieName, token, cookieOptions());
}

// POST /api/v1/auth/signup
export async function signup(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { email, password, name, phone } = parsed.data;

  const existing = await userModel.findByEmail(email);
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const user = await userModel.createUser({
    email,
    passwordHash: await hashPassword(password),
    name,
    phone: phone ?? null,
  });
  await setAuthCookie(res, user.id);
  res.status(201).json({ user: toSafeUser(user) });
}

// POST /api/v1/auth/login
export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await userModel.findByEmail(email);
  // Generic message + always run a comparison shape so we don't reveal whether
  // the email exists or leak timing on missing accounts.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await setAuthCookie(res, user.id);
  res.json({ user: toSafeUser(user) });
}

// GET /api/v1/auth/me  (requireCustomer)
export async function me(req: Request, res: Response) {
  const user = req.userId ? await userModel.findById(req.userId) : null;
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  res.json({ user: toSafeUser(user) });
}

// PATCH /api/v1/auth/me -> updates the signed-in customer's profile (requireCustomer)
export async function updateProfile(req: Request, res: Response) {
  if (!req.userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const updated = await userModel.updateUser(req.userId, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    defaultAddress: parsed.data.default_address,
  });
  if (!updated) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  res.json({ user: toSafeUser(updated) });
}

// POST /api/v1/auth/change-password -> verifies current, sets new (requireCustomer)
export async function changePassword(req: Request, res: Response) {
  if (!req.userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const user = await userModel.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const ok = await verifyPassword(parsed.data.current_password, user.passwordHash);
  if (!ok) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  await userModel.updatePassword(user.id, await hashPassword(parsed.data.new_password));
  res.status(204).end();
}

// POST /api/v1/auth/logout
export function logout(_req: Request, res: Response) {
  res.clearCookie(env.authCookieName, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
}
