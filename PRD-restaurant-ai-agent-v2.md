# PRD: AI Agent Restaurant Ordering System (v2)

**Status:** v2 — as-built (updated 2026-07-28)
**Stack:** Next.js frontend · Express backend · Neon DB (Postgres) via Drizzle · OpenAI Agents SDK

> This document has been updated to describe the **system as actually built**. The project was
> originally specced as a single full-stack Next.js app (v1); it has since split into separate
> frontend + backend services and grown a v2 feature set (menu admin, analytics, delivery + live
> tracking, kitchen kanban). Sections below reflect the current code, not the original draft.

---

## 1. Problem Statement

Customers browsing a static menu often hesitate, order the wrong thing, or abandon the order entirely because they can't get quick answers about dishes, ingredients, or spice level. Meanwhile, restaurants have no lightweight way to route an order from customer → kitchen → owner without manual re-entry, phone calls, or a paper ticket getting lost.

## 2. Goals & Non-Goals

**Goals (v1)**
- Let a customer complete an order entirely through natural conversation
- Give the kitchen a live, accurate order queue with status control
- Give the owner a live view of orders and basic daily performance

**v2 additions (built)**
- Owner **menu management** — add/edit menu items and toggle availability (no longer seed-only)
- Owner **sales analytics** — revenue, top items, revenue-over-time, status breakdown, date-scoped
- **Delivery ordering + live tracking** — a foodpanda-style "where's my food" flow with a map

**Non-Goals** — see Section 12 for the full out-of-scope list. In short: no payments, no
reservations, no recommendation sub-agent, no multi-location support. (Menu editing and delivery
tracking were v1 non-goals but have since been built — see §12.)

## 3. Users & Personas

| User | Role | Primary need |
|---|---|---|
| **Customer** | Orders via a conversational agent instead of a static menu | Fast, accurate ordering without menu confusion |
| **Kitchen/Chef** | Sees incoming orders in real time, updates status | Zero missed orders, minimal friction to update status |
| **Owner/Admin** | Views live orders, sales, order history | Visibility without needing to be on the floor |

## 4. Tech Stack

The system is a **Turborepo monorepo** (npm workspaces) split into two deployable services plus
shared packages.

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js** (App Router) — `frontend/` | UI only; calls the backend over HTTP via `NEXT_PUBLIC_API_BASE_URL` (see `frontend/lib/api.ts`) |
| Backend | **Express** (MVC) — `backend/` | API service under `/api/v1`; `routes → controllers → models`; run via `tsx` |
| Shared packages | `@repo/db`, `@repo/shared`, `@repo/agent` | Drizzle schema/client; types + zod + DTOs; agent tools/topology |
| Runtime | **Node.js** | Powers the Express server + the standalone realtime listener |
| Database | **Neon DB** (serverless Postgres) | Branching for dev/preview; **pooled** connection string in the app, **direct** for `LISTEN/NOTIFY` |
| ORM | **Drizzle ORM** (`pg`/node-postgres) | Type-safe schema + migrations; `pg` driver chosen over `neon-http` because it supports transactions (§8) |
| Agent framework | **OpenAI Agents SDK** | Main "Host" agent + order-taking sub-agent; tools bound to real menu; model swappable via env |
| Charts | **Recharts** (frontend) | Owner analytics dashboard |
| Realtime | **SSE** bridged to Postgres **`LISTEN/NOTIFY`** | Neon has no built-in pub/sub — see §6.3 (built) |
| Deployment | Vercel (frontend) + any Node host (backend) | Neon pairs natively with Vercel's preview branching |

> **Why frontend + backend are split** (the PRD originally specced a single full-stack Next.js
> app): separating the Next.js UI from the Express API lets the two deploy and scale independently
> and keeps the agent/DB code out of the browser bundle. The agent architecture, data model, and
> `/api/v1` contract are unchanged by the split.
>
> **Why Postgres over an earlier MongoDB/FastAPI draft:** real relational integrity
> (orders → order_items → menu_items) makes the reporting/analytics in §3 simple `GROUP BY`
> queries instead of app-level aggregation over denormalized documents.

## 5. Agent Architecture (OpenAI Agents SDK)

### 5.1 Agent Topology
- **Main Agent (Router, "Host")** — owns the conversation, classifies intent (`order`, `menu_question`, `other`), and hands off to the Order-Taking Agent when the customer is ready to commit items
- **Order-Taking Agent** — extracts structured order data from the conversation and emits it via the `propose_order` tool
- **Structured order via tool + run context (not output-schema-across-handoff).** Rather than relying on a strict JSON schema surviving an agent handoff (unreliable across OpenAI-compatible models), `propose_order` validates the draft against the DB and stashes it in the run **context**; the backend route reads it back. Tool-calling is widely supported; strict `json_schema` is not.
- **Guardrails** — an input guardrail rejects off-topic/abusive input before it reaches either agent (currently a heuristic blocklist/length placeholder, to be upgraded to an LLM classifier); the proposed order is validated against the DB inside `propose_order` and again by `zod` at the route boundary
- **Tools** exposed to the agents:
  - `get_menu()` — reads current menu from Postgres (so the agent never hallucinates items)
  - `check_item_availability(item_id)`
  - `propose_order(items)` — returns a structured draft order for confirmation, does not commit it

### 5.2 Session & State
- Use the Agents SDK's session/conversation history per `session_id` so context (e.g. a menu question mid-order) doesn't reset the in-progress order
- The agent never writes directly to the `orders` table — it returns a **proposed order**; the backend API route (`POST /orders`) validates and commits it (keeps agent output and system-of-record writes decoupled)

### 5.3 Acceptance Criteria
- Given a customer describes what they want in natural language, the agent proposes a structured order matching real menu items (via `get_menu`, never invented)
- Given a customer asks a menu question mid-order, the Main Agent answers without losing order context
- Given the agent can't confidently match an item, it asks a clarifying question instead of guessing
- Given the agent's proposed order fails validation (item not found/unavailable), `propose_order` returns the problems so the agent re-asks; a proposed order is also re-validated by `zod` on commit and rejected (400) if malformed

## 6. Data Models (Postgres / Neon)

### 6.1 Schema

Source of truth: `packages/db/src/schema.ts` (Drizzle). The DDL below reflects the shipped schema
including the v2 delivery + menu-admin columns.

```sql
CREATE TABLE menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  price_cents   INTEGER NOT NULL,
  category      TEXT NOT NULL,             -- 'starter' | 'main' | 'dessert' etc.
  tags          TEXT[] NOT NULL DEFAULT '{}',  -- 'vegetarian', 'spicy', 'gluten-free'
  available     BOOLEAN NOT NULL DEFAULT true,
  archived      BOOLEAN NOT NULL DEFAULT false, -- v2: soft-delete (hidden but FK-safe)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()  -- v2: admin edits
);

CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status           TEXT NOT NULL DEFAULT 'received',   -- received|preparing|ready|served
  source           TEXT NOT NULL DEFAULT 'agent',      -- agent|manual
  order_type       TEXT NOT NULL DEFAULT 'dine_in'     -- v2: dine_in|delivery|pickup
                   CHECK (order_type IN ('dine_in','delivery','pickup')),
  session_id       TEXT,
  -- v2 delivery details (nullable; set only for delivery orders)
  customer_name    TEXT,
  customer_phone   TEXT,
  delivery_address TEXT,
  dest_lat         DOUBLE PRECISION,
  dest_lng         DOUBLE PRECISION,
  eta_minutes      INTEGER,
  dispatched_at    TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id     UUID NOT NULL REFERENCES menu_items(id),
  name             TEXT NOT NULL,      -- denormalized snapshot at order time
  unit_price_cents INTEGER NOT NULL,   -- denormalized price snapshot at order time
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  notes            TEXT
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_type ON orders(order_type);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

Using a relational schema (instead of a document model) means order history and daily-sales reporting (Section 3) are simple `GROUP BY` queries instead of app-level aggregation.

> Note: `order_items.menu_item_id → menu_items(id)` has **no `ON DELETE` rule**, so a menu item
> referenced by past orders can't be hard-deleted — hence the `archived` soft-delete column (§7).

### 6.2 Why denormalized `name` + `unit_price_cents` snapshots on `order_items`
If a menu item's name or price changes later, past orders should still reflect what the customer actually ordered — so both the item **name and its unit price** are copied at order time rather than joined live. The price snapshot makes owner revenue/analytics (§7) exact even after menu prices change.

### 6.3 Realtime Without a Native Pub/Sub — **built**
Neon is serverless Postgres — it doesn't push change events on its own. Both layers are implemented:
1. **Polling fallback:** kitchen/owner clients poll `GET /api/v1/orders?status=` every 2.5–3s when SSE is unavailable. The public `/track` page polls `GET /orders/:id/tracking` (~2.5s).
2. **SSE + `LISTEN/NOTIFY`:** the backend (`backend/src/realtime/orderListener.ts`) opens a dedicated **unpooled** `pg` client (the Neon pooler can't `LISTEN`), listens on `orders_channel`, and broadcasts each notification to connected SSE clients at `GET /api/v1/orders/stream`. The `useOrders` hook (`frontend/lib/useOrders.ts`) is SSE-first and transparently falls back to polling if the stream drops. EventSource can't send headers, so the staff key rides `?key=`.

The NOTIFY trigger lives in `packages/db/src/triggers.ts` (installed by a separate idempotent
`npm run db:triggers` script, **not** the migration). Its payload is the raw `orders` row only (no
items), so SSE clients treat an event as a "refetch" signal:
```sql
CREATE OR REPLACE FUNCTION notify_order_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('orders_channel', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_notify
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION notify_order_change();
```

## 7. API Design

All routes versioned under `/api/v1`, served by the **Express backend** (`backend/src/routes/`).
Auth: **staff routes** require the `x-staff-key` header (or `?key=` for SSE, since EventSource can't
set headers); customer-facing routes (chat, menu read, order create, tracking read) are public.

```
--- Orders ---
POST   /api/v1/orders                                    (public)
  body: { source?, session_id?, order_type?,             -- order_type: dine_in|delivery|pickup
          customer_name?, customer_phone?, address?,     -- required when order_type = delivery
          dest_lat?, dest_lng?,
          items: [{ menu_item_id, quantity, notes? }] }
  returns: 201 OrderWithItems                            -- created in a single transaction

GET    /api/v1/orders?status=&limit=                     (staff)   returns: OrderWithItems[]
GET    /api/v1/orders/{id}                               (staff)   returns: OrderWithItems
PATCH  /api/v1/orders/{id}/status                        (staff)
  body: { status: "preparing" | "ready" | "served" }    -- enforces the state machine (409 on illegal)
  returns: OrderWithItems
GET    /api/v1/orders/stream                             (staff, SSE)  order_change events

--- Delivery tracking (v2) ---
GET    /api/v1/orders/{id}/tracking                      (public)  returns: TrackingState
  { stage, courierPos {x,y}, progress, etaMinutes, timeline[], address, ... }
POST   /api/v1/orders/{id}/dispatch                      (staff)   body: { eta_minutes? }  (409 if not a delivery)
POST   /api/v1/orders/{id}/delivered                     (staff)   marks delivered + status=served

--- Menu ---
GET    /api/v1/menu[?includeArchived=1]                  (public; archived only with staff)  returns: MenuItem[]
POST   /api/v1/menu                                      (staff)   body: { name, price_cents, category, description?, tags?, available? }
PATCH  /api/v1/menu/{id}                                 (staff)   partial update
PATCH  /api/v1/menu/{id}/availability                    (staff)   body: { available }
DELETE /api/v1/menu/{id}[?hard=1]                        (staff)   soft-delete (archive) by default;
                                                                   hard=1 permanently deletes, 409 if referenced by past orders

--- Analytics (v2) ---
GET    /api/v1/analytics?from=&to=                       (staff)
  returns: { summary { revenueCents, orderCount, itemCount, avgOrderCents },
             statusCounts[], topItems[], revenueOverTime[] }   -- computed server-side from order_items snapshots

--- Agent ---
POST   /api/v1/agent/chat                                (public)
  body: { session_id, message }
  returns: { reply: string, proposed_order?: ProposedOrder, needs_clarification: boolean }
```

> **`ProposedOrder` (agent draft, snake_case) vs `OrderWithItems` (persisted, camelCase)** are two
> distinct shapes: the agent proposes an order; the customer confirms it via `POST /orders`, which
> is what the system of record stores. The agent never writes to the DB (§5.2).

## 8. Non-Functional Requirements

- Order creation → kitchen display: under 2 seconds
- Handle at least 10 concurrent open orders without status-update lag
- Agent responses: under 5 seconds per turn under normal load
- LLM model must be swappable via env var without code changes
- All writes to `orders`/`order_items` happen in a single DB transaction (no partial order writes)

## 9. Security & Data Integrity — **built**

- **Input validation:** all API input is validated with `zod` at the route boundary (`packages/shared/src/validation.ts`) — agent output is never trusted directly and is re-validated on `POST /orders`.
- **Staff auth:** kitchen/owner routes + tracking-write routes require a staff key (`x-staff-key` header, `?key=` for SSE) via `backend/src/middlewares/auth.middleware.ts`. Customer-facing chat, menu read, order create, and tracking read are public. *Dev note:* auth is disabled when `STAFF_API_KEY` is unset.
- **Rate limiting:** a global per-IP limiter (120 req/60s) on all `/api/` routes, plus a per-session limiter on the agent chat (20 req/60s) to cap abuse/cost. Both are in-memory (v1-only; not multi-instance safe).
- **State machine:** `PATCH /orders/{id}/status` enforces `received → preparing → ready → served`; illegal transitions return **409**.
- **Transactions & connections:** order writes are single-transaction (§8); the app uses Neon's **pooled** connection string, while the realtime listener uses a **direct** connection for `LISTEN/NOTIFY`.

## 10. Edge Cases & Error Handling

| Scenario | Expected behavior |
|---|---|
| Agent can't match requested item to menu | Ask a clarifying question, don't guess or invent an item |
| Customer changes mind mid-order | Agent updates the in-progress (proposed) order, doesn't create a duplicate |
| Kitchen view loses SSE connection | Falls back to polling `/api/v1/orders` until reconnected |
| Two orders submitted at once | Both persist independently — Postgres row-level writes, no overwrites |
| LLM proposes an invalid/unavailable item | `propose_order` returns the problems to the agent, which re-asks; `zod` rejects a malformed order on commit (400) |
| Menu item marked unavailable mid-order | Agent tool `check_item_availability` blocks it before proposing the order |
| Illegal kitchen status transition (e.g. `received → served`) | Rejected with **409**; only the single legal next step is accepted (§9 state machine) |
| Delivery order missing customer name/phone/address | Rejected with **400** at the boundary (`zod` `superRefine`) |
| Dispatch/deliver on a non-delivery order | Rejected with **409** |
| Hard-deleting a menu item referenced by past orders | Rejected with **409**; use soft-delete (archive) instead |

## 11. Build Order (Phased) — **phases 1–7 built**

1. ✅ **Repo & DB setup** — Neon project + branches, Drizzle schema + migrations
2. ✅ **Frontend shells** — customer chat UI, kitchen queue UI, owner dashboard UI
3. ✅ **Core CRUD API** — `/orders`, `/menu` routes against real Neon data
4. ✅ **Agent integration** — OpenAI Agents SDK wired to `/api/v1/agent/chat`, tools bound to real menu
5. ✅ **Realtime wiring** — polling fallback + SSE + `LISTEN/NOTIFY`
6. ✅ **Hardening** — rate limiting, staff auth on kitchen/owner routes, transaction wrapping
7. ✅ **v2 UI expansion** — frontend/backend split; menu admin CRUD; owner analytics (Recharts) + order drill-down; delivery ordering + live tracking (`/track/[id]`, SVG map); kitchen kanban with age badges + new-order chime; shared frontend infra (`apiFetch`, toast, expanded UI kit, loading/error boundaries)

## 12. Out of Scope

- Payments
- Reservations / table booking
- Recommendation sub-agent
- Multi-restaurant / multi-location support

> **Graduated into scope in v2 (now built):** owner menu editing/management (`/owner/menu` + menu
> CRUD API) and delivery tracking (`/track/[id]` + tracking API). Note the delivery **map is an
> inline SVG mock** with a computed (not GPS) courier position — a real map/tiles integration and
> real courier GPS remain out of scope.

## 13. Success Criteria

- Customer can complete an order through conversation, without needing a static menu
- Kitchen sees new orders in real time (kanban) and can advance status
- Owner dashboard reflects orders live and shows sales analytics (revenue, top items, over time)
- Owner can manage the menu (add/edit/availability/archive) without touching the DB
- A delivery customer can track their order on a live map with an ETA
- All acceptance criteria in Sections 5.3 and 6 pass under NFR targets (Section 8)

## 14. Risks & Assumptions

- **Assumption:** menu is now editable via the owner admin UI (`/owner/menu`); the 9 seed items are just an initial dataset (`packages/db/src/seed.ts`)
- **Assumption:** the delivery map is a **mock** — courier position is interpolated from `dispatched_at` + `eta_minutes` along a fixed route, not real GPS
- **Risk:** structured-output reliability varies by model — mitigated by using the `propose_order` tool + run context (not strict output-schema-across-handoff) plus `zod` validation on commit (Section 5.1)
- **Risk:** SSE reliability on serverless hosting (connections can be recycled) — mitigated by the polling fallback (Section 6.3)
- **Risk:** Neon connection limits under load — mitigated by the pooled connection string in the app (direct only for `LISTEN/NOTIFY`)
- **Risk:** agent sessions + rate-limit state are **in-memory** (lost on restart, not multi-instance safe) — acceptable for v1/v2; a durable store is future work
