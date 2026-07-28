// A proposed order is a validated draft the agent builds via the propose_order
// tool. It is NOT committed — the frontend confirms it via POST /orders
// (PRD §5.2: the agent never writes to the orders table). Shared here so both
// the agent (which builds it) and the frontend (which renders it) can use it.
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
