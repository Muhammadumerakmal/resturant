// Centralized environment configuration. Reading env access through one module
// keeps defaults consistent and makes the required vars easy to find.

export const env = {
  port: Number(process.env.PORT ?? 4000),
  // Comma-separated allowlist so one backend can serve local dev AND the
  // deployed frontend(s), e.g. "http://localhost:3000,https://app.vercel.app".
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL,
  staffApiKey: process.env.STAFF_API_KEY,
  // Customer auth (JWT in an httpOnly cookie). JWT_SECRET must be set in prod;
  // the dev fallback keeps `npm run dev` working without extra setup.
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-jwt-secret-change-me",
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "tavola_auth",
  isProd: process.env.NODE_ENV === "production",
};
