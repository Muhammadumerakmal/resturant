import { z } from "zod";

// Validate all API input at the route boundary (PRD §9) — never trust callers.
export const createOrderSchema = z
  .object({
    session_id: z.string().min(1).max(200).optional(),
    source: z.enum(["agent", "manual"]).optional(),
    order_type: z.enum(["dine_in", "delivery", "pickup"]).optional(),
    // Delivery details — required (below) only when order_type === "delivery".
    customer_name: z.string().min(1).max(120).optional(),
    customer_phone: z.string().min(3).max(40).optional(),
    address: z.string().min(1).max(400).optional(),
    dest_lat: z.number().min(-90).max(90).optional(),
    dest_lng: z.number().min(-180).max(180).optional(),
    items: z
      .array(
        z.object({
          menu_item_id: z.string().uuid(),
          quantity: z.number().int().positive(),
          notes: z.string().max(500).optional(),
        }),
      )
      .min(1, "An order needs at least one item"),
  })
  .superRefine((val, ctx) => {
    if (val.order_type === "delivery") {
      if (!val.customer_name)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_name"],
          message: "Delivery orders need a customer name",
        });
      if (!val.customer_phone)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_phone"],
          message: "Delivery orders need a phone number",
        });
      if (!val.address)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "Delivery orders need a delivery address",
        });
    }
  });

export const patchStatusSchema = z.object({
  // `received` is the initial state; it is not a valid transition target (PRD §7).
  status: z.enum(["preparing", "ready", "served"]),
});

// --- Menu admin (owner CRUD) ---------------------------------------------
export const createMenuItemSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(600).optional(),
  price_cents: z.number().int().nonnegative(),
  category: z.string().min(1).max(60),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  available: z.boolean().optional(),
});

// Partial update — every field optional, but at least one must be present.
export const updateMenuItemSchema = createMenuItemSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

export const setAvailabilitySchema = z.object({
  available: z.boolean(),
});

// --- Delivery dispatch ----------------------------------------------------
export const dispatchSchema = z.object({
  eta_minutes: z.number().int().positive().max(240).optional(),
});

// --- Analytics ------------------------------------------------------------
export const statsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PatchStatusInput = z.infer<typeof patchStatusSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type DispatchInput = z.infer<typeof dispatchSchema>;
export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
