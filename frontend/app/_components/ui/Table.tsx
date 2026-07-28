import { cn } from "@/lib/cn";
import { Card } from "./Card";

// Extracted from the owner dashboard's inline table markup. `Table` wraps the
// scroll container + card surface; the head/body/row/cell primitives keep the
// consistent padding, borders and hover treatment.
export function Table({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    </Card>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
      {children}
    </thead>
  );
}

export function TH({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th className={cn("px-4 py-2.5 font-medium", className)}>{children}</th>
  );
}

export function TR({
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border transition-colors last:border-0 hover:bg-muted/40",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  className,
  children,
  colSpan,
}: {
  className?: string;
  children?: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-2.5", className)}>
      {children}
    </td>
  );
}
