import { createApp } from "../src/app";

// Vercel serverless entry point. Vercel's @vercel/node builder treats a default-
// exported Express app as the request handler, so we export the app WITHOUT
// calling app.listen() (that lives in src/index.ts for local / long-lived hosts).
//
// Caveat: SSE (`GET /api/v1/orders/stream`) and the Postgres LISTEN/NOTIFY
// listener need a persistent process, which serverless functions don't provide.
// On Vercel the realtime stream won't hold open — the frontend already falls back
// to polling `GET /api/v1/orders`, so kitchen/owner stay live (just via polling).
export default createApp();
