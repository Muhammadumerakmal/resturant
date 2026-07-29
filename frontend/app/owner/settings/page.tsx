"use client";

import { useEffect, useState } from "react";
import { KeyRound, Settings as SettingsIcon } from "lucide-react";
import type { RestaurantSettings } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOwner } from "../OwnerShell";
import { Button } from "@/app/_components/ui/Button";
import { Card } from "@/app/_components/ui/Card";
import { Input } from "@/app/_components/ui/Input";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Textarea } from "@/app/_components/ui/Select";
import { useToast } from "@/app/_components/ui/Toast";

type FormState = {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  staff_key_hint: string;
};

function toForm(s: RestaurantSettings): FormState {
  return {
    name: s.name ?? "",
    tagline: s.tagline ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    hours: s.hours ?? "",
    staff_key_hint: s.staffKeyHint ?? "",
  };
}

export default function OwnerSettingsPage() {
  const { staffKey } = useOwner();
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<RestaurantSettings>("/api/v1/settings")
      .then((s) => setForm(toForm(s)))
      .catch(() => toast("Couldn't load settings", "warning"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await apiFetch<RestaurantSettings>("/api/v1/settings", {
        method: "PATCH",
        body: form,
        staffKey,
      });
      setForm(toForm(updated));
      toast("Settings saved", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "warning");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => form && setForm({ ...form, [k]: e.target.value });

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Settings"
        subtitle="Restaurant profile shown across the public site"
        icon={<SettingsIcon className="h-5 w-5" />}
      />

      {!form ? (
        <Skeleton className="mt-6 h-96 w-full" />
      ) : (
        <div className="mt-6 max-w-2xl space-y-6">
          <Card className="space-y-3 p-5">
            <Field label="Restaurant name">
              <Input value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Tagline">
              <Input value={form.tagline} onChange={set("tagline")} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <Input value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="Email">
                <Input value={form.email} onChange={set("email")} type="email" />
              </Field>
            </div>
            <Field label="Address">
              <Textarea rows={2} value={form.address} onChange={set("address")} />
            </Field>
            <Field label="Hours">
              <Input value={form.hours} onChange={set("hours")} />
            </Field>
            <div className="flex justify-end pt-1">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <KeyRound className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Staff access</h2>
                <p className="text-xs text-muted-foreground">
                  The staff key is a server secret (env <code>STAFF_API_KEY</code>).
                  Rotating it is an environment change + redeploy — it can&apos;t be
                  edited here. Set a non-sensitive reminder below if helpful.
                </p>
              </div>
            </div>
            <Field label="Staff key hint (non-sensitive)">
              <Input
                value={form.staff_key_hint}
                onChange={set("staff_key_hint")}
                placeholder="e.g. rotated 2026-07; in 1Password › Tavola"
              />
            </Field>
            <div className="flex justify-end">
              <Button variant="outline" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save hint"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </main>
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
