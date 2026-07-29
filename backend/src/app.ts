import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { rateLimit } from "./middlewares/rateLimit.middleware";
import { apiRouter } from "./routes";

// Builds and configures the Express application (middleware + routes). Kept
// separate from the server bootstrap in index.ts so it can be imported/tested
// without opening a port.
export function createApp() {
  const app = express();

  // credentials:true is required so the browser sends/stores the auth cookie on
  // cross-origin (frontend :3000 → backend :4000) requests. Pairs with an exact
  // origin (never "*") and apiFetch's credentials:"include".
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/", rateLimit);

  app.get("/", (_req, res) => {
    res.json({
      service: "restaurant-ai-agent backend",
      health: "/health",
      api: "/api/v1",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/v1", apiRouter);

  return app;
}
