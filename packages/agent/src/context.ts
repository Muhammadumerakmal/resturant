import type { ProposedOrder } from "@repo/shared";

// Per-run mutable context. propose_order writes the validated draft here so the
// route can read it back out after the agent finishes. ProposedOrder itself
// lives in @repo/shared so the frontend can render it without importing @repo/agent.
export type AgentContext = {
  proposedOrder: ProposedOrder | null;
};
