"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "./ui/Button";
import { Brand } from "./Brand";

const LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/reservations", label: "Reservations" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// Public site header: brand + section links + auth actions. Used on the
// marketing pages (landing/about/contact/reservations/reviews). Collapses to a
// toggle menu on small screens so phone users can still navigate.
export function SiteNav() {
  const pathname = usePathname();
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    cn(
      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
      pathname === href
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  // Auth actions, rendered in both the desktop bar and the mobile panel.
  const authActions = (
    <>
      {ready && user ? (
        <>
          <Link href="/orders" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              My orders
            </Button>
          </Link>
          <Link href="/account" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              Account
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            Sign out
          </Button>
        </>
      ) : (
        <>
          <Link href="/login" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              Log in
            </Button>
          </Link>
          <Link href="/signup" onClick={() => setOpen(false)}>
            <Button size="sm" className="w-full sm:w-auto">
              Sign up
            </Button>
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Brand onClick={() => setOpen(false)} />

        {/* Desktop: section links */}
        <div className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop: auth actions */}
        <div className="hidden items-center gap-2 sm:flex">{authActions}</div>

        {/* Mobile: menu toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile: expanding panel */}
      {open && (
        <div className="border-t border-border/60 px-6 py-3 sm:hidden">
          <div className="flex flex-col gap-0.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(linkClass(l.href), "px-3 py-2")}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
            {authActions}
          </div>
        </div>
      )}
    </header>
  );
}
