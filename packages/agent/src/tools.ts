import { tool } from "@openai/agents";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "@repo/db";
import { menuItems } from "@repo/db/schema";
import type { AgentContext } from "./context";

// Tools read the REAL menu from Postgres so the agent never invents items (PRD §5.1).

export const getMenu = tool({
  name: "get_menu",
  description:
    "Get the current restaurant menu. Always call this before proposing an order so item names, ids and prices are real. Returns available and unavailable items.",
  parameters: z.object({}),
  execute: async () => {
    const items = await db.select().from(menuItems);
    return items.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: m.priceCents / 100,
      category: m.category,
      tags: m.tags,
      available: m.available,
    }));
  },
});

export const checkItemAvailability = tool({
  name: "check_item_availability",
  description:
    "Check whether a specific menu item (by its id from get_menu) is currently available before proposing it.",
  parameters: z.object({
    item_id: z.string().describe("The menu item UUID from get_menu"),
  }),
  execute: async ({ item_id }) => {
    const [m] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, item_id));
    if (!m) return { found: false, available: false };
    return { found: true, available: m.available, name: m.name };
  },
});

export const proposeOrder = tool({
  name: "propose_order",
  description:
    "Propose a draft order for the customer to confirm. This does NOT place the order — it only builds a draft. Call it once the customer has chosen concrete menu items and quantities. If any item is unknown or unavailable, this returns problems instead of a draft; relay those to the customer.",
  parameters: z.object({
    items: z
      .array(
        z.object({
          menu_item_id: z.string().describe("UUID from get_menu"),
          quantity: z.number().int().positive(),
          // Nullable (not optional) keeps the JSON schema strict-mode friendly.
          notes: z.string().nullable().describe("Special requests, or null"),
        }),
      )
      .min(1),
  }),
  execute: async ({ items }, runContext) => {
    const ctx = runContext?.context as AgentContext | undefined;

    const ids = [...new Set(items.map((i) => i.menu_item_id))];
    const rows = await db
      .select()
      .from(menuItems)
      .where(inArray(menuItems.id, ids));
    const byId = new Map(rows.map((m) => [m.id, m]));

    const problems: string[] = [];
    const lineItems = [];
    for (const it of items) {
      const m = byId.get(it.menu_item_id);
      if (!m) {
        problems.push(`Unknown menu item id: ${it.menu_item_id}`);
        continue;
      }
      if (!m.available) {
        problems.push(`${m.name} is currently unavailable`);
        continue;
      }
      lineItems.push({
        menu_item_id: m.id,
        name: m.name,
        unit_price_cents: m.priceCents,
        quantity: it.quantity,
        notes: it.notes ?? null,
      });
    }

    if (problems.length > 0) {
      return { ok: false, problems };
    }

    const proposed = {
      items: lineItems,
      total_cents: lineItems.reduce(
        (s, li) => s + li.unit_price_cents * li.quantity,
        0,
      ),
    };
    // Stash the validated draft so the route can return it to the frontend.
    if (ctx) ctx.proposedOrder = proposed;
    return { ok: true, proposed_order: proposed };
  },
});
