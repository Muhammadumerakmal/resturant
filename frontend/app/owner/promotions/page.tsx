"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { formatPrice, type Promotion, type PromoType } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOwner } from "../OwnerShell";
import { Badge } from "@/app/_components/ui/Badge";
import { Button } from "@/app/_components/ui/Button";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { Input } from "@/app/_components/ui/Input";
import { Modal } from "@/app/_components/ui/Modal";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Select } from "@/app/_components/ui/Select";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/app/_components/ui/Table";
import { useToast } from "@/app/_components/ui/Toast";

interface FormState {
  id?: string;
  code: string;
  description: string;
  discountType: PromoType;
  value: string; // percent (1–100) or dollars (converted to cents for fixed)
  active: boolean;
  startsAt: string; // datetime-local
  endsAt: string;
}

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  discountType: "percent",
  value: "",
  active: true,
  startsAt: "",
  endsAt: "",
};

// ISO string -> value a datetime-local input accepts ("YYYY-MM-DDTHH:mm").
function toLocalInput(iso: string | Date | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

function formatDiscount(p: Promotion): string {
  return p.discountType === "percent"
    ? `${p.discountValue}%`
    : formatPrice(p.discountValue);
}

export default function OwnerPromotionsPage() {
  const { staffKey } = useOwner();
  const toast = useToast();

  const [rows, setRows] = useState<Promotion[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    apiFetch<Promotion[]>("/api/v1/promotions", { staffKey })
      .then(setRows)
      .catch(() => setRows([]));
  }, [staffKey]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => setForm({ ...EMPTY_FORM });
  const openEdit = (p: Promotion) =>
    setForm({
      id: p.id,
      code: p.code,
      description: p.description ?? "",
      discountType: p.discountType as PromoType,
      value:
        p.discountType === "percent"
          ? String(p.discountValue)
          : (p.discountValue / 100).toFixed(2),
      active: p.active,
      startsAt: toLocalInput(p.startsAt),
      endsAt: toLocalInput(p.endsAt),
    });

  async function save() {
    if (!form) return;
    const num = parseFloat(form.value);
    if (!form.code.trim() || Number.isNaN(num) || num <= 0) {
      toast("Enter a code and a positive value", "warning");
      return;
    }
    const discountValue =
      form.discountType === "percent" ? Math.round(num) : Math.round(num * 100);
    if (form.discountType === "percent" && discountValue > 100) {
      toast("Percent discount can't exceed 100", "warning");
      return;
    }
    const body = {
      code: form.code.trim(),
      description: form.description.trim() || undefined,
      discount_type: form.discountType,
      discount_value: discountValue,
      active: form.active,
      starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    };
    setSaving(true);
    try {
      if (form.id) {
        await apiFetch(`/api/v1/promotions/${form.id}`, {
          method: "PATCH",
          body,
          staffKey,
        });
        toast("Promotion updated", "success");
      } else {
        await apiFetch("/api/v1/promotions", { method: "POST", body, staffKey });
        toast("Promotion created", "success");
      }
      setForm(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "warning");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Promotion) {
    try {
      await apiFetch(`/api/v1/promotions/${p.id}`, { method: "DELETE", staffKey });
      toast(`Deleted ${p.code}`, "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "warning");
    }
  }

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Promotions"
        subtitle="Discount codes customers can use at checkout"
        icon={<Tag className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New code
          </Button>
        }
      />

      <div className="mt-6">
        {rows === null ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Tag className="h-6 w-6" />}
            title="No promotions"
            description="Create your first discount code."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Discount</TH>
                <TH>Window</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((p) => (
                <TR key={p.id} className={p.active ? "" : "opacity-50"}>
                  <TD>
                    <div className="font-mono font-medium">{p.code}</div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground">
                        {p.description}
                      </div>
                    )}
                  </TD>
                  <TD className="tabular-nums">{formatDiscount(p)}</TD>
                  <TD className="text-xs text-muted-foreground">
                    {p.startsAt || p.endsAt
                      ? `${p.startsAt ? new Date(p.startsAt).toLocaleDateString() : "—"} → ${p.endsAt ? new Date(p.endsAt).toLocaleDateString() : "—"}`
                      : "Always"}
                  </TD>
                  <TD>
                    {p.active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="text-muted-foreground transition-colors hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit promotion" : "New promotion"}
      >
        {form && (
          <div className="space-y-3">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. WELCOME10"
                autoFocus
              />
            </Field>
            <Field label="Description">
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional — shown to staff"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({ ...form, discountType: e.target.value as PromoType })
                  }
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </Select>
              </Field>
              <Field
                label={form.discountType === "percent" ? "Percent" : "Amount ($)"}
              >
                <Input
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  inputMode="decimal"
                  placeholder={form.discountType === "percent" ? "10" : "5.00"}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts (optional)">
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </Field>
              <Field label="Ends (optional)">
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
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
