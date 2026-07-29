"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";
import type { MenuItem } from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useMenu } from "@/lib/useMenu";
import { useOwner } from "../OwnerShell";
import { Badge } from "@/app/_components/ui/Badge";
import { Button } from "@/app/_components/ui/Button";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { Input } from "@/app/_components/ui/Input";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/app/_components/ui/Table";
import { useToast } from "@/app/_components/ui/Toast";

const LOW_STOCK = 3;

export default function OwnerInventoryPage() {
  const { staffKey } = useOwner();
  const { items, loaded, refresh } = useMenu({ staffKey });
  const toast = useToast();

  // Per-row draft stock values; falls back to the item's current stock.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const draftFor = (item: MenuItem) =>
    edits[item.id] ??
    (item.stockQuantity === null ? "" : String(item.stockQuantity));

  async function saveStock(item: MenuItem) {
    const raw = draftFor(item).trim();
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      toast("Enter a whole number ≥ 0, or blank to untrack", "warning");
      return;
    }
    setSavingId(item.id);
    try {
      await apiFetch(`/api/v1/menu/${item.id}/stock`, {
        method: "PATCH",
        body: { stock_quantity: value },
        staffKey,
      });
      toast(
        value === null ? `"${item.name}" no longer tracked` : "Stock updated",
        "success",
      );
      setEdits((e) => {
        const next = { ...e };
        delete next[item.id];
        return next;
      });
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "warning");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Inventory"
        subtitle="Track stock; items auto-hide from the menu when they sell out"
        icon={<Boxes className="h-5 w-5" />}
      />

      <div className="mt-6">
        {!loaded ? (
          <Skeleton className="h-64 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-6 w-6" />}
            title="No menu items"
            description="Add items on the Menu page first."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Item</TH>
                <TH>Category</TH>
                <TH>Availability</TH>
                <TH>Stock</TH>
                <TH className="text-right">Set stock</TH>
              </tr>
            </THead>
            <tbody>
              {items.map((item) => {
                const tracked = item.stockQuantity !== null;
                const low = tracked && (item.stockQuantity ?? 0) <= LOW_STOCK;
                return (
                  <TR key={item.id}>
                    <TD className="font-medium">{item.name}</TD>
                    <TD className="capitalize text-muted-foreground">
                      {item.category}
                    </TD>
                    <TD>
                      {item.available ? (
                        <Badge tone="success">Available</Badge>
                      ) : (
                        <Badge tone="warning">Unavailable</Badge>
                      )}
                    </TD>
                    <TD>
                      {!tracked ? (
                        <span className="text-sm text-muted-foreground">
                          Untracked
                        </span>
                      ) : (
                        <Badge tone={low ? "danger" : "neutral"}>
                          {item.stockQuantity} left
                        </Badge>
                      )}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          className="h-8 w-24"
                          inputMode="numeric"
                          placeholder="untracked"
                          value={draftFor(item)}
                          onChange={(e) =>
                            setEdits((s) => ({ ...s, [item.id]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingId === item.id}
                          onClick={() => saveStock(item)}
                        >
                          Save
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </main>
  );
}
