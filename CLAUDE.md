# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

**Foundation built (PRD Phases 1–3).** A Next.js (App Router) + TypeScript + Tailwind app runs at
the repo root, backed by live **Neon Postgres** via **Drizzle** (`pg`/node-postgres driver). What
exists today:
- DB schema + migration + seed (`db/`), 9 seeded menu items.
- CRUD Route Handlers under `app/api/v1/` (`menu`, `orders` GET/POST, `orders/[id]`,
  `orders/[id]/status`), all `zod`-validated, order creation wrapped in a single transaction.
- Three UI shells (`app/customer`, `app/kitchen`, `app/owner`) that poll the API (~2.5–3s).

**Deferred** (not yet built): the OpenAI agent + `/api/v1/agent/chat` (Phase 4), SSE +
`LISTEN/NOTIFY` realtime (Phase 5), auth/rate-limiting/load-testing (Phase 6). The customer page
is a manual order form standing in for the conversational agent until Phase 4.

Two deliberate choices worth knowing:
- **`pg` (node-postgres), not `neon-http`** — the HTTP driver can't do transactions, which PRD §8
  requires for order writes. Routes set `runtime = "nodejs"`. `db/index.ts` reuses one pool.
- **`order_items` also snapshots `unit_price_cents`** (a small extension of the §6.1 DDL) because
  §6.2's own rationale calls out price changes; this makes owner revenue exact.

## What is being built

A single Next.js (App Router) full-stack app where a **customer orders entirely through a
conversational AI agent** instead of a static menu, the **kitchen** gets a live order queue, and
the **owner** sees live orders + basic sales. See `PRD-restaurant-ai-agent-v2.md` for the full
spec, acceptance criteria (§5.3), NFRs (§8), and the phased build order (§11).

## Intended stack

- **Next.js** (App Router) — one deployable; Route Handlers under `/api/v1` are the backend.
- **Neon** (serverless Postgres) with **Drizzle ORM** (preferred over Prisma) for schema + migrations.
- **OpenAI Agents SDK** for the agent layer.
- **Realtime**: polling fallback first, then SSE backed by Postgres `LISTEN/NOTIFY`.
- Deploy target: Vercel (pairs with Neon preview branching).

## Architecture decisions that cross multiple files

These are the non-obvious constraints from the PRD that must hold as code is written:

- **The agent never writes to the DB.** The Order-Taking agent returns a *proposed order*
  (structured output); a Next.js Route Handler validates it with `zod` at the boundary and
  commits it. Keep agent output and system-of-record writes decoupled (PRD §5.2, §9).
- **Two-agent topology.** A Main/Router agent owns the conversation and classifies intent
  (`order` | `menu_question` | `other`), handing off to an Order-Taking sub-agent only when the
  customer commits items. Input guardrail rejects off-topic/abusive input; output guardrail
  validates order JSON against the schema, retrying once before asking the customer to rephrase
  (PRD §5.1, §5.3, §10).
- **Agent tools read real menu data** — `get_menu()`, `check_item_availability(item_id)`,
  `propose_order(items)` — so items are never hallucinated. Session history is keyed by
  `session_id` so a mid-order menu question doesn't reset the in-progress order (PRD §5.2).
- **Relational schema, with a denormalized snapshot.** `orders` → `order_items` → `menu_items`.
  `order_items.name` is copied at order time so past orders reflect what was ordered even if the
  menu changes later. All `orders`/`order_items` writes happen in a **single transaction** — no
  partial orders (PRD §6.1, §6.2, §8).
- **Realtime has no native pub/sub.** Neon can't push events. Baseline is client polling of
  `GET /api/v1/orders?status=` every 2–3s. Target is a long-lived Node-runtime process (not
  edge) holding a Postgres connection on `orders_channel` via `LISTEN/NOTIFY`, bridged to SSE,
  falling back to polling on disconnect. The NOTIFY trigger is in PRD §6.3 (`notify_order_change`).
- **Use Neon's *pooled* connection string** in all serverless routes (not the direct one) to
  avoid exhausting connections (PRD §9, §14).
- **LLM model must be swappable via env var** with no code changes (PRD §8).

## API surface (all under `/api/v1`, as Route Handlers)

`POST /orders` · `GET /orders?status=&limit=` · `GET /orders/{id}` ·
`PATCH /orders/{id}/status` · `POST /agent/chat` (`{ session_id, message }` →
`{ reply, proposed_order?, needs_clarification }`) · `GET /menu` · `GET /orders/stream` (SSE).
Full request/response shapes in PRD §7.

## Explicitly out of scope for v1

No payments, no menu-editing/admin UI (menu is seeded manually into Neon), no reservations,
no delivery tracking, no recommendation sub-agent, no multi-location. Don't build these unless
asked (PRD §12).

## Commands

- `npm run dev` — start the dev server (Turbopack) at http://localhost:3000
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint
- `npm run db:generate` — generate a Drizzle migration from `db/schema.ts` into `db/migrations/`
- `npm run db:migrate` — apply migrations to the DB in `DATABASE_URL`
- `npm run db:seed` — seed menu items (idempotent; skips if `menu_items` is non-empty)
- `npm run db:studio` — open Drizzle Studio

**Env:** `.env.local` holds `DATABASE_URL` (Neon **pooled** connection string) and is gitignored.
`drizzle.config.ts` and the `db:seed` script load it explicitly (drizzle-kit/tsx don't read Next's
env automatically). No test suite exists yet.

Follow the phased build order in PRD §11 for what comes next (agent → realtime → hardening).
