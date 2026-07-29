"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import {
  RESERVATION_STATUSES,
  type Reservation,
  type ReservationStatus,
} from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOwner } from "../OwnerShell";
import { Badge } from "@/app/_components/ui/Badge";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Select } from "@/app/_components/ui/Select";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/app/_components/ui/Table";
import { Tabs } from "@/app/_components/ui/Tabs";
import { useToast } from "@/app/_components/ui/Toast";

type Filter = "all" | ReservationStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "seated", label: "Seated" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_TONE: Record<
  ReservationStatus,
  "warning" | "success" | "info" | "danger"
> = {
  pending: "warning",
  confirmed: "success",
  seated: "info",
  cancelled: "danger",
};

export default function OwnerReservationsPage() {
  const { staffKey } = useOwner();
  const toast = useToast();
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => {
    const qs = filter === "all" ? "" : `?status=${filter}`;
    apiFetch<Reservation[]>(`/api/v1/reservations${qs}`, { staffKey })
      .then(setReservations)
      .catch(() => setReservations([]));
  }, [filter, staffKey]);

  useEffect(() => {
    setReservations(null);
    load();
  }, [load]);

  async function setStatus(id: string, status: ReservationStatus) {
    // Optimistic: reflect the change immediately, roll back on failure.
    const prev = reservations;
    setReservations(
      (rs) => rs?.map((r) => (r.id === id ? { ...r, status } : r)) ?? rs,
    );
    try {
      await apiFetch(`/api/v1/reservations/${id}/status`, {
        method: "PATCH",
        staffKey,
        body: { status },
      });
      toast(`Marked ${status}`, "success");
      // If a filter is active, the row may no longer belong — refresh.
      if (filter !== "all") load();
    } catch (e) {
      setReservations(prev);
      toast(e instanceof Error ? e.message : "Update failed", "warning");
    }
  }

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Reservations"
        subtitle="Table booking requests from the website"
        icon={<CalendarClock className="h-5 w-5" />}
        actions={
          <Tabs
            options={FILTERS}
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
          />
        }
      />

      <div className="mt-6">
        {reservations === null ? (
          <Skeleton className="h-64 w-full" />
        ) : reservations.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" />}
            title="No reservations"
            description={
              filter === "all"
                ? "Booking requests from the website appear here."
                : `No ${filter} reservations right now.`
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Guest</TH>
                <TH>Contact</TH>
                <TH className="text-right">Party</TH>
                <TH>Notes</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {reservations.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap font-medium">
                    {new Date(r.requestedAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TD>
                  <TD>{r.name}</TD>
                  <TD className="text-muted-foreground">
                    <div>{r.phone}</div>
                    {r.email && <div className="text-xs">{r.email}</div>}
                  </TD>
                  <TD className="text-right tabular-nums">{r.partySize}</TD>
                  <TD className="max-w-[16rem] truncate text-muted-foreground">
                    {r.notes || "—"}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[r.status as ReservationStatus]}>
                        {r.status}
                      </Badge>
                      <Select
                        className="h-8 w-32"
                        value={r.status}
                        onChange={(e) =>
                          setStatus(r.id, e.target.value as ReservationStatus)
                        }
                        aria-label="Change status"
                      >
                        {RESERVATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </main>
  );
}
