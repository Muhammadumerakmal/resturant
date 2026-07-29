"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { STAFF_ROLES, type StaffMember, type StaffRole } from "@repo/shared";
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

const ROLE_TONE: Record<StaffRole, "primary" | "info" | "warning" | "neutral"> = {
  owner: "primary",
  manager: "info",
  kitchen: "warning",
  server: "neutral",
};

interface FormState {
  id?: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "server",
  active: true,
};

export default function OwnerStaffPage() {
  const { staffKey } = useOwner();
  const toast = useToast();

  const [rows, setRows] = useState<StaffMember[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    apiFetch<StaffMember[]>("/api/v1/staff", { staffKey })
      .then(setRows)
      .catch(() => setRows([]));
  }, [staffKey]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => setForm({ ...EMPTY_FORM });
  const openEdit = (s: StaffMember) =>
    setForm({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role as StaffRole,
      active: s.active,
    });

  async function save() {
    if (!form) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast("Enter a name and email", "warning");
      return;
    }
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      active: form.active,
    };
    setSaving(true);
    try {
      if (form.id) {
        await apiFetch(`/api/v1/staff/${form.id}`, { method: "PATCH", body, staffKey });
        toast("Staff updated", "success");
      } else {
        await apiFetch("/api/v1/staff", { method: "POST", body, staffKey });
        toast("Staff added", "success");
      }
      setForm(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "warning");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: StaffMember) {
    try {
      await apiFetch(`/api/v1/staff/${s.id}`, { method: "DELETE", staffKey });
      toast(`Removed ${s.name}`, "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "warning");
    }
  }

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Staff"
        subtitle="Your team roster and roles"
        icon={<UserCog className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add staff
          </Button>
        }
      />

      <div className="mt-6">
        {rows === null ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<UserCog className="h-6 w-6" />}
            title="No staff yet"
            description="Add your first team member."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((s) => (
                <TR key={s.id} className={s.active ? "" : "opacity-50"}>
                  <TD className="font-medium">{s.name}</TD>
                  <TD className="text-muted-foreground">{s.email}</TD>
                  <TD>
                    <Badge tone={ROLE_TONE[s.role as StaffRole]}>
                      <span className="capitalize">{s.role}</span>
                    </Badge>
                  </TD>
                  <TD>
                    {s.active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(s)}
                        className="text-muted-foreground transition-colors hover:text-red-600"
                        aria-label="Remove"
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
        title={form?.id ? "Edit staff member" : "Add staff member"}
      >
        {form && (
          <div className="space-y-3">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Priya Sharma"
                autoFocus
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </Field>
            <Field label="Role">
              <Select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as StaffRole })
                }
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
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
