ALTER TABLE "menu_items" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_type" text DEFAULT 'dine_in' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dest_lat" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dest_lng" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "eta_minutes" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dispatched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_orders_order_type" ON "orders" USING btree ("order_type");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_type_valid" CHECK ("orders"."order_type" in ('dine_in', 'delivery', 'pickup'));