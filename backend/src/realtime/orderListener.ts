import { Client } from "pg";
import type { Request, Response } from "express";
import { env } from "../config/env";

// SSE realtime backed by Postgres LISTEN/NOTIFY (PRD §6.3). A dedicated,
// long-lived connection LISTENs on orders_channel and fans notifications out to
// all connected SSE clients. Clients fall back to polling if this drops (§10).

const subscribers = new Set<Response>();

function broadcast(payload: string) {
  for (const res of subscribers) {
    res.write(`event: order_change\n`);
    res.write(`data: ${payload}\n\n`);
  }
}

// SSE endpoint handler: GET /api/v1/orders/stream
export function ordersStream(_req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(": connected\n\n");

  subscribers.add(res);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

  res.on("close", () => {
    clearInterval(heartbeat);
    subscribers.delete(res);
  });
}

// Start the LISTEN connection. LISTEN/NOTIFY needs a *session* (unpooled)
// connection — Neon's pooler can't do it — so we derive the direct URL by
// dropping the "-pooler" host segment. Failure is non-fatal: clients still poll.
export function startOrderListener() {
  const url = env.databaseUrl;
  if (!url) {
    console.warn("realtime: DATABASE_URL unset; SSE will emit nothing (clients poll).");
    return;
  }
  const directUrl = url.replace("-pooler.", ".");
  const client = new Client({ connectionString: directUrl });

  client.on("notification", (msg) => broadcast(msg.payload ?? "{}"));
  client.on("error", (err) =>
    console.warn("realtime: listener error:", err.message),
  );

  client
    .connect()
    .then(() => client.query("LISTEN orders_channel"))
    .then(() => console.log("realtime: LISTENing on orders_channel"))
    .catch((err) =>
      console.warn(
        "realtime: listener disabled, clients fall back to polling:",
        err.message,
      ),
    );
}
