"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, PartyPopper } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { Input } from "../_components/ui/Input";
import { PageHeader } from "../_components/ui/PageHeader";
import { Select, Textarea } from "../_components/ui/Select";
import { SiteNav } from "../_components/SiteNav";

export default function ReservationsPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!when) {
      setError("Please pick a date and time.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/reservations", {
        method: "POST",
        body: {
          name,
          phone,
          email: email || undefined,
          party_size: Number(partySize),
          // datetime-local has no timezone; toISOString normalizes it.
          requested_at: new Date(when).toISOString(),
          notes: notes || undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit — try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <PageHeader
          title="Reserve a table"
          subtitle="Tell us when you'd like to visit"
          icon={<CalendarClock className="h-5 w-5" />}
        />

        {done ? (
          <Card className="mt-8 p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
              <PartyPopper className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Request received!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll confirm your table shortly. Thanks for choosing us.
            </p>
            <Link href="/" className="mt-4 inline-block">
              <Button variant="outline">Back to home</Button>
            </Link>
          </Card>
        ) : (
          <Card className="mt-8 p-6">
            <form onSubmit={onSubmit} className="space-y-3">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    required
                  />
                </Field>
                <Field label="Party size">
                  <Select
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "guest" : "guests"}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Email (optional)">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
              </Field>
              <Field label="Date & time">
                <Input
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  type="datetime-local"
                  required
                />
              </Field>
              <Field label="Notes (optional)">
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergies, high chair, celebration…"
                />
              </Field>

              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Submitting…" : "Request reservation"}
              </Button>
            </form>
          </Card>
        )}
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
