import { z } from "zod";

// Validate all API input at the route boundary (PRD §9) — never trust callers.
export const createOrderSchema = z.object({
  session_id: z.string().min(1).max(200).optional(),
  source: z.enum(["agent", "manual"]).optional(),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid(),
        quantity: z.number().int().positive(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1, "An order needs at least one item"),
});

export const patchStatusSchema = z.object({
  // `received` is the initial state; it is not a valid transition target (PRD §7).
  status: z.enum(["preparing", "ready", "served"]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PatchStatusInput = z.infer<typeof patchStatusSchema>;
