import { Router } from "express";
import { z } from "zod";
import {
  run,
  user,
  InputGuardrailTripwireTriggered,
  type AgentInputItem,
} from "@openai/agents";
import { configureModelProvider, mainAgent, type AgentContext } from "@repo/agent";

export const agentRouter = Router();

// In-memory session history + rate limiter. Ephemeral (resets on restart, not
// shared across instances) — fine for v1; a durable store comes with hardening.
const sessions = new Map<string, AgentInputItem[]>();
const hits = new Map<string, number[]>();
const RATE_LIMIT = 20; // requests per window per session (PRD §9)
const RATE_WINDOW_MS = 60_000;

function rateLimited(sessionId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(sessionId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  recent.push(now);
  hits.set(sessionId, recent);
  return recent.length > RATE_LIMIT;
}

const bodySchema = z.object({
  session_id: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

// POST /api/v1/agent/chat  { session_id, message }
//   -> { reply, proposed_order?, needs_clarification }
agentRouter.post("/chat", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { session_id, message } = parsed.data;

  if (rateLimited(session_id)) {
    res.status(429).json({ error: "Too many requests — please slow down." });
    return;
  }

  try {
    configureModelProvider();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Model not configured" });
    return;
  }

  const history = sessions.get(session_id) ?? [];
  const input: AgentInputItem[] = [...history, user(message)];
  // The agent writes a validated draft here via propose_order; it never commits.
  const context: AgentContext = { proposedOrder: null };

  try {
    const result = await run(mainAgent, input, { context });
    sessions.set(session_id, result.history);

    const reply =
      typeof result.finalOutput === "string"
        ? result.finalOutput
        : String(result.finalOutput ?? "");
    const proposed_order = context.proposedOrder ?? undefined;
    const needs_clarification = !proposed_order && reply.trimEnd().endsWith("?");

    res.json({ reply, proposed_order, needs_clarification });
  } catch (err) {
    if (err instanceof InputGuardrailTripwireTriggered) {
      res.json({
        reply:
          "I can only help with this restaurant's menu and orders. Could you rephrase that?",
        needs_clarification: false,
      });
      return;
    }
    console.error("agent/chat failed:", err);
    res.status(502).json({ error: "The assistant is unavailable right now." });
  }
});
