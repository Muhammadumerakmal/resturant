# PRD: AI Agent Restaurant Ordering System (v2)

**Status:** Draft v2
**Stack:** Next.js (full-stack) · Node.js · Neon DB (Postgres) · OpenAI Agents SDK

---

## 1. Problem Statement

Customers browsing a static menu often hesitate, order the wrong thing, or abandon the order entirely because they can't get quick answers about dishes, ingredients, or spice level. Meanwhile, restaurants have no lightweight way to route an order from customer → kitchen → owner without manual re-entry, phone calls, or a paper ticket getting lost.

## 2. Goals & Non-Goals

**Goals (v1)**
- Let a customer complete an order entirely through natural conversation
- Give the kitchen a live, accurate order queue with status control
- Give the owner a live view of orders and basic daily performance

**Non-Goals (v1)** — see Section 12 for the full out-of-scope list. In short: no payments, no menu-editing UI, no reservations, no multi-location support.

## 3. Users & Personas

| User | Role | Primary need |
|---|---|---|
| **Customer** | Orders via a conversational agent instead of a static menu | Fast, accurate ordering without menu confusion |
| **Kitchen/Chef** | Sees incoming orders in real time, updates status | Zero missed orders, minimal friction to update status |
| **Owner/Admin** | Views live orders, sales, order history | Visibility without needing to be on the floor |

## 4. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend + Backend | **Next.js** (App Router) | Single deployable; API routes / Route Handlers serve as the backend |
| Runtime | **Node.js** | Powers Next.js server + any standalone realtime process |
| Database | **Neon DB** (serverless Postgres) | Branching for dev/preview environments; connection pooling via Neon's pooler |
| ORM | **Drizzle ORM** (recommended) or Prisma | Type-safe schema, migrations |
| Agent framework | **OpenAI Agents SDK** | Main agent + order-taking sub-agent, structured outputs, guardrails, tracing |
| Realtime | Server-Sent Events (SSE) via Route Handlers, or Postgres `LISTEN/NOTIFY` bridged to SSE | Neon has no built-in pub/sub — see Section 6.3 |
| Deployment | Vercel (or any Node host) | Neon pairs natively with Vercel's preview branching |

> **Why this replaces an earlier MongoDB/FastAPI draft:** a single Next.js codebase removes the cross-service boundary between a Python API and a JS frontend, and Postgres gives real relational integrity (orders → order_items → menu_items) instead of denormalized documents — which matters once you add reporting/analytics on top of order history.

## 5. Agent Architecture (OpenAI Agents SDK)

### 5.1 Agent Topology
- **Main Agent (Router)** — owns the conversation, classifies intent (`order`, `menu_question`, `other`), and hands off to the Order-Taking Agent when the customer is ready to commit items
- **Order-Taking Agent** — extracts structured order data from the conversation using a strict output schema enforced by the SDK's structured output support
- **Guardrails** — an input guardrail rejects off-topic/abusive input before it reaches either agent; an output guardrail validates the Order-Taking Agent's JSON against the schema before it's returned to the backend
- **Tools** exposed to the agents:
  - `get_menu()` — reads current menu from Postgres (so the agent never hallucinates items)
  - `check_item_availability(item_id)`
  - `propose_order(items)` — returns a structured draft order for confirmation, does not commit it

### 5.2 Session & State
- Use the Agents SDK's session/conversation history per `session_id` so context (e.g. a menu question mid-order) doesn't reset the in-progress order
- The agent never writes directly to the `orders` table — it returns a **proposed order**; the Next.js API route validates and commits it (keeps agent output and system-of-record writes decoupled)

### 5.3 Acceptance Criteria
- Given a customer describes what they want in natural language, the agent proposes a structured order matching real menu items (via `get_menu`, never invented)
- Given a customer asks a menu question mid-order, the Main Agent answers without losing order context
- Given the agent can't confidently match an item, it asks a clarifying question instead of guessing
- Given the agent's output fails schema validation, the backend rejects it and the SDK retries once before asking the customer to rephrase

## 6. Data Models (Postgres / Neon)

### 6.1 Schema

```sql
CREATE TABLE menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  price_cents   INTEGER NOT NULL,
  category      TEXT NOT NULL,             -- 'starter' | 'main' | 'dessert' etc.
  tags          TEXT[] DEFAULT '{}',        -- 'vegetarian', 'spicy', 'gluten-free'
  available     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status        TEXT NOT NULL DEFAULT 'received',  -- received|preparing|ready|served
  source        TEXT NOT NULL DEFAULT 'agent',      -- agent|manual
  session_id    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES menu_items(id),
  name          TEXT NOT NULL,      -- denormalized snapshot at order time
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  notes         TEXT
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

Using a relational schema (instead of a document model) means order history and daily-sales reporting (Section 3) are simple `GROUP BY` queries instead of app-level aggregation.

### 6.2 Why a denormalized `name` snapshot on `order_items`
If a menu item's name or price changes later, past orders should still reflect what the customer actually ordered — so the item name is copied at order time rather than joined live.

### 6.3 Realtime Without a Native Pub/Sub
Neon is serverless Postgres — it doesn't push change events on its own. Two supported options:
1. **Polling fallback (v1 baseline):** kitchen/dashboard clients poll `GET /api/v1/orders?status=` every 2–3s. Simple, no extra infra.
2. **SSE + `LISTEN/NOTIFY` (v1 target):** a small long-lived Node process (or a Route Handler with the Node runtime, not edge) holds a Postgres connection, listens on an `orders_channel` NOTIFY trigger, and pushes events to connected SSE clients. Falls back to polling if the SSE connection drops.

Trigger to add in migration:
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

All routes versioned under `/api/v1`. Implemented as Next.js Route Handlers.

```
POST   /api/v1/orders
  body: { items: [{ menu_item_id, quantity, notes }] }
  returns: Order

GET    /api/v1/orders?status=&limit=
  returns: Order[]

GET    /api/v1/orders/{id}
  returns: Order

PATCH  /api/v1/orders/{id}/status
  body: { status: "preparing" | "ready" | "served" }
  returns: Order

POST   /api/v1/agent/chat
  body: { session_id, message }
  returns: { reply: string, proposed_order?: Order, needs_clarification: boolean }

GET    /api/v1/menu
  returns: MenuItem[]

GET    /api/v1/orders/stream        (SSE)
  server -> client push on order create/status change
```

## 8. Non-Functional Requirements

- Order creation → kitchen display: under 2 seconds
- Handle at least 10 concurrent open orders without status-update lag
- Agent responses: under 5 seconds per turn under normal load
- LLM model must be swappable via env var without code changes
- All writes to `orders`/`order_items` happen in a single DB transaction (no partial order writes)

## 9. Security & Data Integrity

- Validate all API input with a schema library (e.g. `zod`) at the route boundary — never trust agent output directly
- Rate-limit `/api/v1/agent/chat` per session to prevent abuse/cost overrun
- Kitchen/owner routes require auth (session or API key) — customer-facing chat does not
- Use Neon's pooled connection string in serverless routes to avoid exhausting connections

## 10. Edge Cases & Error Handling

| Scenario | Expected behavior |
|---|---|
| Agent can't match requested item to menu | Ask a clarifying question, don't guess or invent an item |
| Customer changes mind mid-order | Agent updates the in-progress (proposed) order, doesn't create a duplicate |
| Kitchen view loses SSE connection | Falls back to polling `/api/v1/orders` until reconnected |
| Two orders submitted at once | Both persist independently — Postgres row-level writes, no overwrites |
| LLM returns malformed/non-JSON output | Backend rejects it, SDK output guardrail retries once, then asks customer to rephrase |
| Menu item marked unavailable mid-order | Agent tool `check_item_availability` blocks it before proposing the order |

## 11. Build Order (Phased)

1. **Repo & DB setup** — Next.js app, Neon project + branches (dev/preview), Drizzle schema + migrations
2. **Frontend shells** — customer chat UI, kitchen queue UI, owner dashboard UI (mock data first)
3. **Core CRUD API** — `/orders`, `/menu` routes against real Neon data, replace mocks
4. **Agent integration** — OpenAI Agents SDK wired to `/api/v1/agent/chat`, tools bound to real menu data
5. **Realtime wiring** — polling fallback first, then SSE + `LISTEN/NOTIFY`
6. **Hardening** — rate limiting, auth on kitchen/owner routes, transaction wrapping, load test to 10 concurrent orders

## 12. Out of Scope (v1)

- Owner editing/managing the menu (seeded manually into Neon for v1)
- Payments
- Reservations / table booking
- Delivery tracking
- Recommendation sub-agent
- Multi-restaurant / multi-location support

## 13. Success Criteria (v1)

- Customer can complete an order through conversation, without needing a static menu
- Kitchen sees new orders in real time and can update status
- Owner dashboard reflects order status live, no manual refresh needed
- All acceptance criteria in Sections 5.3 and 6 pass under NFR targets (Section 8)

## 14. Risks & Assumptions

- **Assumption:** menu data is seeded manually into Neon for v1 (no admin UI yet)
- **Risk:** structured-output reliability varies by model — mitigated by the SDK's output guardrail + schema validation + single retry (Section 5.3)
- **Risk:** SSE reliability on serverless hosting (connections can be recycled) — mitigated by polling fallback (Section 6.3)
- **Risk:** Neon connection limits under load — mitigated by using the pooled connection string, not the direct one, in all serverless routes
