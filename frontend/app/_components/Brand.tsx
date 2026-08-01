"use client";

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSettings } from "@/lib/useSettings";

// Reusable wordmark: a gradient badge + the (settings-driven) name in the
// display serif. Used in the site nav and footers. Pass href={null} to render
// without a link (e.g. inside a larger clickable area).
export function Brand({
  size = "md",
  href = "/",
  onClick,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  onClick?: () => void;
}) {
  const settings = useSettings();
  const name = settings?.name ?? "Umer Akmal Kitchen";

  const badge = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-9 w-9 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
  }[size];
  const iconSize = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  const textSize = { sm: "text-base", md: "text-lg", lg: "text-2xl" }[size];

  const inner = (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          "inline-flex items-center justify-center bg-gradient-brand text-white shadow-sm",
          badge,
        )}
      >
        <UtensilsCrossed className={iconSize} />
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          textSize,
        )}
      >
        {name}
      </span>
    </span>
  );

  if (href === null) return inner;
  return (
    <Link href={href} onClick={onClick} className="inline-flex">
      {inner}
    </Link>
  );
}
