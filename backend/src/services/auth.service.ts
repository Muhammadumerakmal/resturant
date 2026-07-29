import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env";

// Central home for password hashing + JWT signing so the crypto config lives in
// one place. Uses pure-JS bcryptjs + jose so the esbuild Vercel bundle stays
// free of native addons.

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const secret = new TextEncoder().encode(env.jwtSecret);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

// Returns the user id from a valid token, or null if missing/invalid/expired.
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export const TOKEN_MAX_AGE_MS = TOKEN_TTL_SECONDS * 1000;
