import { cn } from "@/lib/cn";
import type { OrderStatus } from "@repo/shared";
import { StatusPill } from "./StatusPill";

// A column of the kitchen kanban board. Header shows the status pill + a live
// count; the body scrolls independently so long queues don't push the page.
export function KanbanColumn({
  status,
  count,
  children,
  className,
}: {
  status: OrderStatus;
  count: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border border-border bg-muted/30",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <StatusPill status={status} />
        <span className="text-sm font-bold tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  );
}
