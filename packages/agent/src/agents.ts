import { Agent, type InputGuardrail } from "@openai/agents";
import { MODEL } from "./openai";
import { getMenu, checkItemAvailability, proposeOrder } from "./tools";

// --- Input guardrail (PRD §5.1) ---------------------------------------------
// Heuristic placeholder: blocks clearly hostile or oversized input before it
// reaches the model. Upgrade to an LLM-based classifier for real off-topic
// detection when provider budget allows.
const BLOCKLIST = [
  "fuck you",
  "kill yourself",
  "kys",
  "retard",
  "moron",
];

function latestUserText(input: string | unknown[]): string {
  if (typeof input === "string") return input;
  for (let i = input.length - 1; i >= 0; i--) {
    const it = input[i] as { role?: string; content?: unknown };
    if (it?.role === "user") {
      const c = it.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        return c
          .map((p) =>
            typeof p === "string" ? p : ((p as { text?: string })?.text ?? ""),
          )
          .join(" ");
      }
    }
  }
  return "";
}

export const inputSafetyGuardrail: InputGuardrail = {
  name: "input_safety",
  execute: async ({ input }) => {
    const text = latestUserText(input).toLowerCase();
    const abusive = BLOCKLIST.some((w) => text.includes(w));
    const tooLong = text.length > 2000;
    return {
      tripwireTriggered: abusive || tooLong,
      outputInfo: { abusive, tooLong },
    };
  },
};

// --- Agents (PRD §5.1: router hands off to an order-taking sub-agent) --------

const orderTakingAgent = new Agent({
  name: "Order Taker",
  model: MODEL,
  instructions: `You take the customer's food order for this restaurant.
- Use get_menu to see the real items, ids, and prices. Never invent items or ids.
- Confirm the customer's choices and quantities conversationally.
- Once concrete items and quantities are chosen, call propose_order with the exact
  menu_item_id(s), quantities, and notes (or null).
- If propose_order returns problems, explain them plainly and ask the customer to adjust.
- After a draft is proposed, tell the customer to review and confirm it on screen.
Keep replies short and friendly.`,
  tools: [getMenu, checkItemAvailability, proposeOrder],
});

export const mainAgent = new Agent({
  name: "Host",
  model: MODEL,
  instructions: `You are the friendly host of a restaurant's ordering assistant.
- Answer questions about the menu using get_menu (ingredients, spice level, price, dietary tags). Never invent items.
- The moment the customer wants to order or names items they want to buy, hand off to the Order Taker.
- Politely decline anything unrelated to this restaurant's food and ordering.
Keep replies concise.`,
  handoffs: [orderTakingAgent],
  tools: [getMenu, checkItemAvailability],
  inputGuardrails: [inputSafetyGuardrail],
});
