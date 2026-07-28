import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit CLI doesn't auto-load Next's .env.local, so load it here.
config({ path: "../../apps/web/.env.local" });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
