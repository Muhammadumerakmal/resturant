import { NextResponse } from "next/server";
import { z } from "zod";
import {
  run,
  user,
  InputGuardrailTripwireTriggered,
  type AgentInputItem,
} from "@openai/agents";
import { configureModelProvider } from "@repo/agent";
import { mainAgent } from "@repo/agent";
import type { AgentContext, ProposedOrder } from "@repo/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  session_id: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

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

// POST /api/v1/agent/chat  { session_id, message }
//   -> { reply, proposed_order?, needs_clarification }
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { session_id, message } = parsed.data;

  if (rateLimited(session_id)) {
    return NextResponse.json(
      { error: "Too many requests — please slow down." },
      { status: 429 },
    );
  }

  try {
    configureModelProvider();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Model not configured" },
      { status: 500 },
    );
  }

  const history = sessions.get(session_id) ?? [];
  const input: AgentInputItem[] = [...history, user(message)];
  // The agent writes a validated draft here via propose_order; it never commits.
  const context: AgentContext = { proposedOrder: null };

  try {
    const result = await run(mainAgent, input, { context });
    // Persist full conversation so a mid-order menu question keeps context (§5.2).
    sessions.set(session_id, result.history);

    const reply =
      typeof result.finalOutput === "string"
        ? result.finalOutput
        : String(result.finalOutput ?? "");
    const proposed_order: ProposedOrder | undefined =
      context.proposedOrder ?? undefined;
    const needs_clarification =
      !proposed_order && reply.trimEnd().endsWith("?");

    return NextResponse.json({ reply, proposed_order, needs_clarification });
  } catch (err) {
    if (err instanceof InputGuardrailTripwireTriggered) {
      return NextResponse.json({
        reply:
          "I can only help with this restaurant's menu and orders. Could you rephrase that?",
        needs_clarification: false,
      });
    }
    console.error("agent/chat failed:", err);
    return NextResponse.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 },
    );
  }
}
