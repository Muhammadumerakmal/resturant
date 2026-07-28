"use client";

import { useState } from "react";
import { Archive, Pencil, Plus, UtensilsCrossed } from "lucide-react";
import type { MenuItem } from "@repo/shared";
import { formatPrice } from "@repo/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { useMenu } from "@/lib/useMenu";
import { useOwner } from "../OwnerShell";
import { Badge } from "@/app/_components/ui/Badge";
import { Button } from "@/app/_components/ui/Button";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { Input } from "@/app/_components/ui/Input";
import { Modal } from "@/app/_components/ui/Modal";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Select, Textarea } from "@/app/_components/ui/Select";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/app/_components/ui/Table";
import { useToast } from "@/app/_components/ui/Toast";

const CATEGORIES = ["starter", "main", "dessert", "drink", "side"];

interface FormState {
  id?: string;
  name: string;
  description: string;
  priceDollars: string;
  category: string;
  tags: string;
  available: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  priceDollars: "",
  category: "main",
  tags: "",
  available: true,
};

export default function OwnerMenuPage() {
  const { staffKey } = useOwner();
  const { items, loaded, refresh } = useMenu({ staffKey, includeArchived: true });
  const toast = useToast();

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => setForm({ ...EMPTY_FORM });
  const openEdit = (item: MenuItem) =>
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      priceDollars: (item.priceCents / 100).toFixed(2),
      category: item.category,
      tags: item.tags.join(", "),
      available: item.available,
    });

  async function save() {
    if (!form) return;
    const priceCents = Math.round(parseFloat(form.priceDollars) * 100);
    if (!form.name.trim() || Number.isNaN(priceCents) || priceCents < 0) {
      toast("Enter a name and a valid price", "warning");
      return;
    }
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price_cents: priceCents,
      category: form.category,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      available: form.available,
    };
    setSaving(true);
    try {
      if (form.id) {
        await apiFetch(`/api/v1/menu/${form.id}`, { method: "PATCH", body, staffKey });
        toast("Item updated", "success");
      } else {
        await apiFetch("/api/v1/menu", { method: "POST", body, staffKey });
        toast("Item added", "success");
      }
      setForm(null);
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "warning");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: MenuItem) {
    try {
      await apiFetch(`/api/v1/menu/${item.id}/availability`, {
        method: "PATCH",
        body: { available: !item.available },
        staffKey,
      });
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "warning");
    }
  }

  async function archive(item: MenuItem) {
    try {
      await apiFetch(`/api/v1/menu/${item.id}`, { method: "DELETE", staffKey });
      toast(`Archived "${item.name}"`, "success");
      refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Delete failed";
      toast(msg, "warning");
    }
  }

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Menu"
        subtitle="Add, edit, and manage availability of menu items"
        icon={<UtensilsCrossed className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        }
      />

      <div className="mt-6">
        {!loaded ? (
          <Skeleton className="h-64 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="h-6 w-6" />}
            title="No menu items"
            description="Add your first item to get started."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Item</TH>
                <TH>Category</TH>
                <TH className="text-right">Price</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {items.map((item) => (
                <TR key={item.id} className={item.archived ? "opacity-50" : ""}>
                  <TD>
                    <div className="font-medium">{item.name}</div>
                    {item.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.tags.map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </div>
                    )}
                  </TD>
                  <TD className="capitalize text-muted-foreground">{item.category}</TD>
                  <TD className="text-right tabular-nums">
                    {formatPrice(item.priceCents)}
                  </TD>
                  <TD>
                    {item.archived ? (
                      <Badge tone="neutral">Archived</Badge>
                    ) : item.available ? (
                      <Badge tone="success">Available</Badge>
                    ) : (
                      <Badge tone="warning">Unavailable</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      {!item.archived && (
                        <>
                          <button
                            onClick={() => toggle(item)}
                            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {item.available ? "Set unavailable" : "Set available"}
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => archive(item)}
                            className="text-muted-foreground transition-colors hover:text-red-600"
                            aria-label="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </>
                      )}
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
        title={form?.id ? "Edit item" : "Add item"}
      >
        {form && (
          <div className="space-y-3">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Butter Chicken"
                autoFocus
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price ($)">
                <Input
                  value={form.priceDollars}
                  onChange={(e) => setForm({ ...form, priceDollars: e.target.value })}
                  inputMode="decimal"
                  placeholder="12.50"
                />
              </Field>
              <Field label="Category">
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Tags (comma-separated)">
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="vegetarian, spicy"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Available to order
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
