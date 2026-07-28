# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

**PRD Phases 1–4 built, split into a `frontend` + `backend` Turborepo monorepo.** The **frontend**
is a Next.js (App Router) UI (`frontend/`); the **backend** is an Express API service (`backend/`)
backed by live **Neon Postgres** via **Drizzle** (`pg`/node-postgres). Shared logic lives in
workspace packages. What exists today:
- **DB** (`packages/db`): schema + migration + seed, 9 seeded menu items.
- **CRUD API** (`backend/src/routes/`): `menu`, `orders` GET/POST, `orders/:id`,
  `orders/:id/status` — `zod`-validated, order creation in a single transaction. `cors`-enabled.
- **Agent** (`packages/agent`, Phase 4): OpenAI Agents SDK against any OpenAI-compatible endpoint
  (currently DeepSeek). Router "Host" agent hands off to an "Order Taker"; tools `get_menu` /
  `check_item_availability` / `propose_order` bound to the real menu; input guardrail. Served at
  `POST /api/v1/agent/chat` by the backend.
- **UI** (`frontend/app/{customer,kitchen,owner}`): customer is a **chat** that confirms a proposed
  order via `POST /orders`; kitchen/owner poll (~2.5–3s). All calls go to the backend via
  `NEXT_PUBLIC_API_BASE_URL` (see `frontend/lib/api.ts`).

**Deferred** (not yet built): SSE + `LISTEN/NOTIFY` realtime (Phase 5), auth/rate-limiting beyond
a light in-memory throttle/load-testing (Phase 6).

Deliberate choices worth knowing:
- **`pg` (node-postgres), not `neon-http`** — the HTTP driver can't do transactions, which PRD §8
  requires. Routes set `runtime = "nodejs"`. `packages/db` reuses one pool.
- **`order_items` also snapshots `unit_price_cents`** (small extension of the §6.1 DDL) — §6.2's
  own rationale calls out price changes; makes owner revenue exact.
- **Structured order via the `propose_order` tool, not output-schema-across-handoff.** The tool
  validates against the DB and stashes the draft in the run **context**; the route reads it back.
  Robust across OpenAI-compatible models (tool-calling is widely supported; strict json_schema is not).
- **Agent never writes to the DB** — it returns a proposed order; the chat UI confirms → `POST /orders`.

## Repo layout (Turborepo + npm workspaces)

```
frontend/            Next.js UI (pages only; @/ = frontend root, .env.local, lib/api.ts)  → @repo/frontend
backend/             Express API service (src/index.ts + src/routes/*, .env)               → @repo/backend
packages/db/         Drizzle schema, client, migrations, seed, drizzle.config  → @repo/db, @repo/db/schema
packages/shared/     types, zod validation, format, errors, ProposedOrder DTO  → @repo/shared
packages/agent/      OpenAI Agents SDK: openai config, tools, agents, context   → @repo/agent
turbo.json           task pipelines (dev/build/lint/typecheck)
tsconfig.base.json   shared compiler options (packages extend it)
```
Packages are **internal (source-exported) packages** — no build step; consumers list them in
`transpilePackages` (frontend) or run them via `tsx` (backend). Deps: `shared`→`db`; `agent`→`db`,
`shared`; `backend`→`db`, `shared`, `agent`; **`frontend`→`shared` only** (no DB/agent in the UI
bundle — that's why `ProposedOrder` lives in `shared`, not `agent`).

## What is being built

A **customer orders entirely through a conversational AI agent** instead of a static menu, the
**kitchen** gets a live order queue, and the **owner** sees live orders + basic sales. The frontend
(Next.js) talks to the backend (Express) over HTTP. See `PRD-restaurant-ai-agent-v2.md` for the full
spec, acceptance criteria (§5.3), NFRs (§8), and the phased build order (§11).

> Note: the PRD (§4) originally specified a single full-stack Next.js app. This repo instead splits
> frontend and backend into separate services per a later decision — the agent/DB architecture and
> API contract are unchanged.

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

## API surface (all under `/api/v1`, served by the Express backend)

`POST /orders` · `GET /orders?status=&limit=` · `GET /orders/:id` ·
`PATCH /orders/:id/status` · `POST /agent/chat` (`{ session_id, message }` →
`{ reply, proposed_order?, needs_clarification }`) · `GET /menu` · `GET /orders/stream` (SSE, Phase 5).
Full request/response shapes in PRD §7. The frontend never calls these relatively — always through
`api()` in `frontend/lib/api.ts` (base = `NEXT_PUBLIC_API_BASE_URL`).

## Explicitly out of scope for v1

No payments, no menu-editing/admin UI (menu is seeded manually into Neon), no reservations,
no delivery tracking, no recommendation sub-agent, no multi-location. Don't build these unless
asked (PRD §12).

## Commands

Run from the repo root (they fan out through Turborepo / npm workspaces):
- `npm run dev` — start **both** services: frontend (http://localhost:3000) + backend
  (http://localhost:4000), via `turbo` persistent tasks.
- `npm run build` / `npm run lint` / `npm run typecheck` — via `turbo`
- `npm run db:generate` — generate a Drizzle migration (delegates to `@repo/db`)
- `npm run db:migrate` — apply migrations to `DATABASE_URL`
- `npm run db:seed` — seed menu items (idempotent; skips if `menu_items` is non-empty)
- `npm run db:studio` — Drizzle Studio

**Env — two files, both gitignored:**
- `backend/.env` — `DATABASE_URL` (Neon **pooled**), `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY`
  (any OpenAI-compatible, tool-calling endpoint), `PORT`, `CORS_ORIGIN`. Backend loads it via
  `tsx --env-file`; `packages/db` tooling loads it via `../../backend/.env`.
- `frontend/.env.local` — `NEXT_PUBLIC_API_BASE_URL` (the backend URL). No secrets.

No test suite yet.

Follow the phased build order in PRD §11 for what comes next (realtime → hardening).
