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
  Sparkles,
  Star,
  Tag,
  UserCog,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Grouped so the sidebar reads as sections instead of one long list.
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/owner", label: "Dashboard", icon: BarChart3 },
      { href: "/owner/assistant", label: "Assistant", icon: Sparkles },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/owner/orders", label: "Orders", icon: ScrollText },
      { href: "/owner/deliveries", label: "Deliveries", icon: Bike },
      // /kitchen lives outside /owner (its own StaffGate) — a convenience link.
      { href: "/kitchen", label: "Kitchen", icon: ChefHat },
      { href: "/owner/reservations", label: "Reservations", icon: CalendarClock },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/owner/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/owner/inventory", label: "Inventory", icon: Boxes },
      { href: "/owner/promotions", label: "Promotions", icon: Tag },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/owner/customers", label: "Customers", icon: Users },
      { href: "/owner/reviews", label: "Reviews", icon: Star },
      { href: "/owner/staff", label: "Staff", icon: UserCog },
    ],
  },
  {
    title: "System",
    items: [{ href: "/owner/settings", label: "Settings", icon: Settings }],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(href: string, pathname: string) {
  return href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);
}

// Single staff gate for the whole /owner section, plus the shared nav. Owner
// pages read the key via useOwner() instead of gating themselves.
export function OwnerShell({ children }: { children: React.ReactNode }) {
  const { key, ready, save, clear } = useStaffKey();
  const pathname = usePathname();

  if (!ready) return null;
  if (!key) return <StaffGate title="Owner Dashboard" onSubmit={save} />;

  return (
    <OwnerContext.Provider value={{ staffKey: key, signOut: clear }}>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:py-8">
        {/* Sidebar — wide screens */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-8 flex max-h-[calc(100vh-4rem)] flex-col">
            <div className="mb-5 flex items-center gap-2.5 px-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ChefHat className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight">
                  Owner Console
                </div>
                <div className="text-xs text-muted-foreground">Manage store</div>
              </div>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="px-3 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.title}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href, pathname);
                      return (
                        <Link
                          key={href}
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              active
                                ? "text-primary"
                                : "text-muted-foreground/70 group-hover:text-foreground",
                            )}
                          />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
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
        </aside>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile nav — horizontal scroll */}
          <div className="lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ChefHat className="h-4 w-4" />
                </span>
                Owner Console
              </div>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={clear}
                  className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Sign out</span>
                </button>
                <HomeLink />
              </div>
            </div>
            <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href, pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {children}
        </div>
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
