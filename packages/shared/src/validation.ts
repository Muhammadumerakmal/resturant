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

// --- Customer auth --------------------------------------------------------
export const signupSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().min(1).max(120),
  phone: z.string().min(3).max(40).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

// Account page: edit profile. At least one field required (partial update).
export const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(120),
    phone: z.string().min(3).max(40),
    default_address: z.string().max(400),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});

// --- Reservations ---------------------------------------------------------
export const createReservationSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(3).max(40),
  email: z.string().email().max(200).optional(),
  party_size: z.number().int().positive().max(50),
  requested_at: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "seated", "cancelled"]),
});

// --- Restaurant settings (owner) ------------------------------------------
export const updateSettingsSchema = z
  .object({
    name: z.string().min(1).max(160),
    tagline: z.string().max(300),
    phone: z.string().max(60),
    email: z.string().email().max(200),
    address: z.string().max(400),
    hours: z.string().max(300),
    staff_key_hint: z.string().max(200),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

// --- Staff roster (owner) -------------------------------------------------
export const createStaffSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  role: z.enum(["owner", "manager", "kitchen", "server"]),
  active: z.boolean().optional(),
});

export const updateStaffSchema = createStaffSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

// --- Reviews --------------------------------------------------------------
export const createReviewSchema = z.object({
  name: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  order_id: z.string().uuid().optional(),
});

export const updateReviewStatusSchema = z.object({
  status: z.enum(["pending", "published", "hidden"]),
});

// --- Promotions (owner) ---------------------------------------------------
export const createPromotionSchema = z.object({
  code: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().int().positive(),
  active: z.boolean().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});

export const updatePromotionSchema = createPromotionSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

export const validatePromotionSchema = z.object({
  code: z.string().min(1).max(60),
});

// --- Inventory ------------------------------------------------------------
// stock_quantity nullable: null clears tracking (unlimited), a number sets it.
export const setStockSchema = z.object({
  stock_quantity: z.number().int().min(0).max(1_000_000).nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PatchStatusInput = z.infer<typeof patchStatusSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type DispatchInput = z.infer<typeof dispatchSchema>;
export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationStatusInput = z.infer<typeof updateReservationStatusSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewStatusInput = z.infer<typeof updateReviewStatusSchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type ValidatePromotionInput = z.infer<typeof validatePromotionSchema>;
export type SetStockInput = z.infer<typeof setStockSchema>;
