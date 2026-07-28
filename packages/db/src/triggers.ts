// Installs the orders_notify trigger (PRD §6.3) so every INSERT/UPDATE on orders
// emits a NOTIFY on 'orders_channel'. Idempotent — safe to re-run.
// Run with: npm run db:triggers
import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION notify_order_change() RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('orders_channel', row_to_json(NEW)::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS orders_notify ON orders;`);
  await db.execute(sql`
    CREATE TRIGGER orders_notify
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION notify_order_change();
  `);
  console.log("orders_notify trigger installed on orders_channel.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to install trigger:", err);
    process.exit(1);
  });
