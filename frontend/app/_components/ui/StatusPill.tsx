import { cn } from "@/lib/cn";
import type { OrderStatus } from "@repo/shared";

// Single source of truth for order-status styling, shared by kitchen + owner.
const STATUS_STYLES: Record<OrderStatus, string> = {
  received:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  preparing:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ready:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  served:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
};

const DOT: Record<OrderStatus, string> = {
  received: "bg-blue-500",
  preparing: "bg-amber-500",
  ready: "bg-green-500",
  served: "bg-neutral-400",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[status])} />
      {status}
    </span>
  );
}
