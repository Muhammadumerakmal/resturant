"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bike,
  Boxes,
  CalendarClock,
  ChefHat,
  LogOut,
  Radio,
  ScrollText,
  Settings,
  Star,
  Tag,
  UserCog,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useStaffKey } from "@/lib/useStaffKey";
import { StaffGate } from "../_components/StaffGate";
import { HomeLink } from "../_components/ui/PageHeader";

interface OwnerContextValue {
  staffKey: string;
  signOut: () => void;
}

const OwnerContext = createContext<OwnerContextValue | null>(null);

export function useOwner() {
  const ctx = useContext(OwnerContext);
  if (!ctx) throw new Error("useOwner must be used within OwnerShell");
  return ctx;
}

const NAV = [
  { href: "/owner", label: "Dashboard", icon: BarChart3 },
  { href: "/owner/orders", label: "Orders", icon: ScrollText },
  { href: "/owner/deliveries", label: "Deliveries", icon: Bike },
  { href: "/owner/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/owner/reservations", label: "Reservations", icon: CalendarClock },
  { href: "/owner/inventory", label: "Inventory", icon: Boxes },
  { href: "/owner/customers", label: "Customers", icon: Users },
  { href: "/owner/reviews", label: "Reviews", icon: Star },
  { href: "/owner/promotions", label: "Promotions", icon: Tag },
  { href: "/owner/staff", label: "Staff", icon: UserCog },
  // /kitchen lives outside /owner (its own StaffGate) — a convenience link.
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/owner/settings", label: "Settings", icon: Settings },
];

// Single staff gate for the whole /owner section, plus the shared subnav. Owner
// pages read the key via useOwner() instead of gating themselves.
export function OwnerShell({ children }: { children: React.ReactNode }) {
  const { key, ready, save, clear } = useStaffKey();
  const pathname = usePathname();

  if (!ready) return null;
  if (!key) return <StaffGate title="Owner Dashboard" onSubmit={save} />;

  return (
    <OwnerContext.Provider value={{ staffKey: key, signOut: clear }}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/owner"
                  ? pathname === "/owner"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={clear}
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
            <HomeLink />
          </div>
        </div>
        {children}
      </div>
    </OwnerContext.Provider>
  );
}

// Small shared live/polling indicator reused across owner pages.
export function LivePill({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        live
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
          : "bg-muted text-muted-foreground",
      )}
      title={live ? "Realtime (SSE) connected" : "Polling"}
    >
      <Radio className={cn("h-3.5 w-3.5", live && "animate-pulse")} />
      {live ? "Live" : "Polling"}
    </span>
  );
}
