# 🍽️ Tavola — AI-Powered Restaurant Platform

A full-stack restaurant application where **customers order through a conversational AI agent**
instead of a static menu, the **kitchen** gets a live order queue, and the **owner** runs the whole
business — sales analytics, menu, inventory, staff, reviews, promotions, reservations, and
deliveries — from one console, aided by a second **AI analytics assistant**.

**Live demo:** https://resturant-frontend-alpha.vercel.app
_(The `/owner` and `/kitchen` areas are staff-gated by a key; the public site, menu, AI ordering
chat, reservations, reviews, and customer accounts are open to try.)_

---

## ✨ Highlights

- **Conversational ordering** — an OpenAI Agents SDK agent takes orders in natural language, grounded
  in the real menu via tools (never hallucinated), and returns a **structured proposed order** the
  UI confirms before it's committed.
- **Owner analytics assistant** — a second, read-only AI that answers "how were sales last week?",
  "what's my best seller?", "anything low on stock?" by querying live data.
- **Real-time kitchen board** — Postgres `LISTEN/NOTIFY` → SSE, with automatic polling fallback.
- **Full owner back-office** — dashboard charts, orders, deliveries + tracking, menu admin,
  inventory, staff roster, review moderation, promotions, customers, reservations, settings.
- **Customer accounts** — real auth (bcrypt + JWT in an httpOnly cookie), order history, receipts,
  reorder, saved profile.
- **Delivery tracking** — a foodpanda-style live map with a courier interpolated along a route
  (computed, never stored), no map library.

## 🏗️ Architecture

A **Turborepo monorepo** split into a Next.js frontend and an Express backend, sharing type-safe
workspace packages:

```
frontend/   Next.js (App Router) UI            → @repo/frontend   (Vercel)
backend/    Express API (MVC)                  → @repo/backend    (Vercel, esbuild-bundled fn)
packages/
  db/       Drizzle schema, migrations, seed   → @repo/db         (Neon Postgres)
  shared/   types, zod validation, DTOs        → @repo/shared
  agent/    OpenAI Agents SDK: agents + tools  → @repo/agent
```

**Design decisions worth knowing:**
- **The agent never writes to the DB.** It returns a *proposed order*; a zod-validated route commits
  it in a single transaction — agent output and system-of-record writes stay decoupled.
- **Two-agent topology** — a router agent classifies intent and hands off to an order-taker only when
  the customer commits; an input guardrail rejects off-topic/abusive input.
- **`pg` (node-postgres), not the HTTP driver** — real transactions are required (no partial orders).
- **Denormalized `order_items` snapshot** (name + unit price at order time) so past orders survive
  menu edits.
- **Model is swappable via env var** — any OpenAI-compatible, tool-calling endpoint.
- **Source-only workspace packages** — no build step; the backend runs via `tsx` and is shipped to
  Vercel as one esbuild-bundled function (see `backend/VERCEL_DEPLOYMENT.md`).

## 🧰 Tech stack

| Layer      | Tech |
|------------|------|
| Frontend   | Next.js (App Router), React, TypeScript, Tailwind, Recharts, lucide-react |
| Backend    | Express, TypeScript, zod |
| Database   | Neon (serverless Postgres) + Drizzle ORM |
| AI         | OpenAI Agents SDK (OpenAI-compatible endpoint) |
| Auth       | bcryptjs + jose (HS256 JWT in an httpOnly cookie) |
| Realtime   | Postgres `LISTEN/NOTIFY` → SSE, polling fallback |
| Tooling    | Turborepo, npm workspaces |
| Hosting    | Vercel (frontend + backend) + Neon |

## 🚀 Getting started

```bash
npm install

# Env — two gitignored files:
#   backend/.env         DATABASE_URL (Neon pooled), LLM_BASE_URL/LLM_MODEL/LLM_API_KEY,
#                        STAFF_API_KEY, JWT_SECRET, CORS_ORIGIN, PORT
#   frontend/.env.local  NEXT_PUBLIC_API_BASE_URL (the backend URL)

npm run db:migrate   # apply schema to the database
npm run db:seed      # seed menu, settings, staff, promotions, reviews (idempotent)
npm run dev          # frontend :3000 + backend :4000
```

Other scripts: `npm run build` · `npm run lint` · `npm run typecheck` · `npm run db:studio`.

## 📁 What's built

**Customer:** AI ordering chat · menu browse + item detail · order history + receipt + reorder ·
delivery tracking · reservations · reviews · accounts (signup/login/profile/change-password).

**Owner/staff:** analytics dashboard · AI assistant · orders + kitchen kanban · deliveries · menu
admin · inventory (stock auto-hides sold-out items) · staff roster · review moderation · promotions ·
customers · reservations · settings.

**Public:** marketing landing · about · contact · reviews.

## 📝 Notes & scope

Built as a portfolio project. Intentionally **out of scope**: online payments, applying promo
discounts to order totals at checkout, and emailed password reset (no mail provider wired). Realtime
uses polling on Vercel's serverless functions (SSE needs an always-on host).

---

_Built with Next.js, Express, Drizzle, Neon, and the OpenAI Agents SDK._
