"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserCog } from "lucide-react";
import type { SafeUser } from "@repo/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { SiteNav } from "../_components/SiteNav";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { Input } from "../_components/ui/Input";
import { PageHeader } from "../_components/ui/PageHeader";
import { Skeleton } from "../_components/ui/Skeleton";
import { useToast } from "../_components/ui/Toast";

export default function AccountPage() {
  const { user, ready, refresh } = useAuth();
  const router = useRouter();

  // Customer-only page: bounce guests to sign in and come back here after.
  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/account");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <>
        <SiteNav />
        <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
          <Skeleton className="h-64 w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <PageHeader
          title="Your account"
          subtitle={user.email}
          icon={<UserCog className="h-5 w-5" />}
        />
        <ProfileCard user={user} onSaved={refresh} />
        <PasswordCard />
      </main>
    </>
  );
}

function ProfileCard({
  user,
  onSaved,
}: {
  user: SafeUser;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.defaultAddress ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/me", {
        method: "PATCH",
        body: {
          name,
          // phone has a min-length rule; only send it when non-empty.
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          default_address: address.trim(),
        },
      });
      await onSaved();
      toast("Profile updated", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Profile
      </h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Phone">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="Optional"
          />
        </Field>
        <Field label="Default delivery address">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Saved for faster delivery orders"
          />
        </Field>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/change-password", {
        method: "POST",
        body: { current_password: current, new_password: next },
      });
      toast("Password changed", "success");
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't change password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <KeyRound className="h-4 w-4" /> Change password
      </h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <Field label="Current password">
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
