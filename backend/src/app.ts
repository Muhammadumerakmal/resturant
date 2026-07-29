import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { rateLimit } from "./middlewares/rateLimit.middleware";
import { apiRouter } from "./routes";

// Builds and configures the Express application (middleware + routes). Kept
// separate from the server bootstrap in index.ts so it can be imported/tested
// without opening a port.
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
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
