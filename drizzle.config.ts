import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit CLI doesn't auto-load Next's .env.local, so load it here.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
