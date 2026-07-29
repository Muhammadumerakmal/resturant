import {
  run,
  user,
  type AgentInputItem,
} from "@openai/agents";
import {
  configureModelProvider,
  mainAgent,
  ownerAgent,
  type AgentContext,
} from "@repo/agent";

// Service layer for the conversational agent. Holds the ephemeral session
// history + per-session rate state, and runs the agent. Kept out of the
// controller so the HTTP layer stays thin. Ephemeral (resets on restart, not
// shared across instances) — fine for v1; a durable store comes with hardening.

const sessions = new Map<string, AgentInputItem[]>();
const hits = new Map<string, number[]>();
const RATE_LIMIT = 20; // requests per window per session (PRD §9)
const RATE_WINDOW_MS = 60_000;

export function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(sessionId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  recent.push(now);
  hits.set(sessionId, recent);
  return recent.length > RATE_LIMIT;
}

export interface AgentReply {
  reply: string;
  proposed_order?: AgentContext["proposedOrder"];
  needs_clarification: boolean;
}

// Ensure the LLM provider is configured from env. Throws with a helpful message
// if required vars are missing — the controller maps that to a 500.
export function configure() {
  configureModelProvider();
}

// Runs one turn of the conversation. Throws on model/guardrail errors — the
// controller maps those to HTTP responses.
export async function chat(sessionId: string, message: string): Promise<AgentReply> {
  const history = sessions.get(sessionId) ?? [];
  const input: AgentInputItem[] = [...history, user(message)];
  // The agent writes a validated draft here via propose_order; it never commits.
  const context: AgentContext = { proposedOrder: null };

  const result = await run(mainAgent, input, { context });
  sessions.set(sessionId, result.history);

  const reply =
    typeof result.finalOutput === "string"
      ? result.finalOutput
      : String(result.finalOutput ?? "");
  const proposed_order = context.proposedOrder ?? undefined;
  const needs_clarification = !proposed_order && reply.trimEnd().endsWith("?");

  return { reply, proposed_order, needs_clarification };
}

// --- Owner analytics assistant ----------------------------------------------
// Separate ephemeral session store + agent for the staff-only owner section.
// Read-only (never proposes/commits orders), so the reply is just text.
const ownerSessions = new Map<string, AgentInputItem[]>();

export async function ownerChat(
  sessionId: string,
  message: string,
): Promise<{ reply: string }> {
  const history = ownerSessions.get(sessionId) ?? [];
  const input: AgentInputItem[] = [...history, user(message)];

  const result = await run(ownerAgent, input);
  ownerSessions.set(sessionId, result.history);

  const reply =
    typeof result.finalOutput === "string"
      ? result.finalOutput
      : String(result.finalOutput ?? "");
  return { reply };
}
