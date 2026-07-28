# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repo is **pre-implementation**. The only file is `PRD-restaurant-ai-agent-v2.md` — a
detailed product spec for an AI-agent restaurant ordering system. No app has been scaffolded
yet (no `package.json`, no source, no git repo). Treat the PRD as the source of truth for
architecture decisions; when you scaffold code, update this file with the real commands.

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

Not yet defined — the app hasn't been scaffolded. Once it is (Next.js + Drizzle), record here
the real commands for: dev server, build, lint, running the test suite and a single test, and
Drizzle migrate/generate/push. Follow the phased build order in PRD §11 when starting.
