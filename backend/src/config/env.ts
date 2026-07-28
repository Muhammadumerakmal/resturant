// Centralized environment configuration. Reading env access through one module
// keeps defaults consistent and makes the required vars easy to find.

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  staffApiKey: process.env.STAFF_API_KEY,
};
