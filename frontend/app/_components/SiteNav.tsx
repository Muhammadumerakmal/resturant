"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/AuthContext";
import { useSettings } from "@/lib/useSettings";
import { Button } from "./ui/Button";

const LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/reservations", label: "Reservations" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// Public site header: brand + section links + auth actions. Used on the
// marketing pages (landing/about/contact/reservations).
export function SiteNav() {
  const pathname = usePathname();
  const { user, ready, logout } = useAuth();
  const settings = useSettings();

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          {settings?.name ?? "Tavola"}
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === l.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {ready && user ? (
            <>
              <Link href="/orders">
                <Button variant="ghost" size="sm">
                  My orders
                </Button>
              </Link>
              <Link href="/account">
                <Button variant="ghost" size="sm">
                  Account
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
