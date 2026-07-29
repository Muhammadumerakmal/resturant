import type { Request, Response } from "express";
import { z } from "zod";
import { InputGuardrailTripwireTriggered } from "@openai/agents";
import * as agentService from "../services/agent.service";

const bodySchema = z.object({
  session_id: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

// POST /api/v1/agent/chat  { session_id, message }
//   -> { reply, proposed_order?, needs_clarification }
export async function chat(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { session_id, message } = parsed.data;

  if (agentService.isRateLimited(session_id)) {
    res.status(429).json({ error: "Too many requests — please slow down." });
    return;
  }

  try {
    agentService.configure();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Model not configured" });
    return;
  }

  try {
    const result = await agentService.chat(session_id, message);
    res.json(result);
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
}

// POST /api/v1/agent/owner-chat  { session_id, message }  -> { reply }
// Staff-only (mounted behind requireStaff). Answers business/analytics
// questions; read-only, so it never returns a proposed order.
export async function ownerChat(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { session_id, message } = parsed.data;

  if (agentService.isRateLimited(session_id)) {
    res.status(429).json({ error: "Too many requests — please slow down." });
    return;
  }

  try {
    agentService.configure();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Model not configured" });
    return;
  }

  try {
    const result = await agentService.ownerChat(session_id, message);
    res.json(result);
  } catch (err) {
    if (err instanceof InputGuardrailTripwireTriggered) {
      res.json({
        reply:
          "I can only help with this restaurant's sales and analytics. Could you rephrase that?",
      });
      return;
    }
    console.error("agent/owner-chat failed:", err);
    res.status(502).json({ error: "The assistant is unavailable right now." });
  }
}
