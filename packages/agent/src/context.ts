// A proposed order is a validated draft the agent builds via the propose_order
// tool. It is NOT committed — the route/frontend commits it via POST /orders
// (PRD §5.2: the agent never writes to the orders table).
export type ProposedLineItem = {
  menu_item_id: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
  notes: string | null;
};

export type ProposedOrder = {
  items: ProposedLineItem[];
  total_cents: number;
};

// Per-run mutable context. propose_order writes the draft here so the route can
// read it back out after the agent finishes.
export type AgentContext = {
  proposedOrder: ProposedOrder | null;
};
